require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { 
  MESSAGE_MAX_LENGTH, 
  TITLE_MAX_LENGTH, 
  SSE_PING_INTERVAL, 
  SSE_RECONNECT_DELAY,
  DEFAULT_TITLE,
  DEFAULT_PORT 
} = require('./config/constants');

const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;
const CORS_ORIGINS = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
  'http://localhost:3000', 
  'http://localhost:3001',
  /https:\/\/.*\.railway\.app$/,
  /https:\/\/.*\.up\.railway\.app$/
];

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false // SSE를 위해 CSP 비활성화
}));
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// SSE 클라이언트들 관리
const sseClients = new Set();

// 간단한 rate limiting을 위한 Map (IP별 요청 추적)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1분
const MAX_REQUESTS_PER_WINDOW = 300; // 분당 300회 (대량 처리용)

/**
 * 간단한 rate limiting 미들웨어
 * @param {Object} req - Express request 객체
 * @param {Object} res - Express response 객체
 * @param {Function} next - 다음 미들웨어 함수
 */
function rateLimiter(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const clientData = rateLimitMap.get(clientIP);
  
  if (now > clientData.resetTime) {
    // 윈도우 리셋
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
    });
  }
  
  clientData.count++;
  next();
}

// 사용자 접속 통계 관리
const activeSessions = new Set(); // 활성 세션 ID들을 저장
let userStats = {
  currentUsers: 0,
  totalVisits: 0,
  lastVisit: null
};

// 앱 설정 관리
let appSettings = {
  title: process.env.DEFAULT_APP_TITLE || DEFAULT_TITLE
};

// 풍선 상태 관리
let balloonState = {
  lastUpdated: new Date().toISOString()
};

// SSE 연결 엔드포인트
app.get('/api/balloon-stream', (req, res) => {
  
  // SSE 헤더 설정
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // 클라이언트 등록
  sseClients.add(res);

  // Keep-alive ping
  const pingInterval = setInterval(() => {
    if (sseClients.has(res)) {
      res.write(': ping\n\n');
    } else {
      clearInterval(pingInterval);
    }
  }, SSE_PING_INTERVAL);

  // 연결이 끊어졌을 때 정리
  req.on('close', () => {
    sseClients.delete(res);
    clearInterval(pingInterval);
  });
});

// 브로드캐스트 큐 관리
const broadcastQueue = [];
let isBroadcasting = false;

/**
 * 배치 브로드캐스트 처리
 */
async function processBroadcastQueue() {
  if (isBroadcasting || broadcastQueue.length === 0) return;
  
  isBroadcasting = true;
  const batch = broadcastQueue.splice(0, 10); // 한번에 10개씩 처리
  
  await Promise.all(batch.map(eventData => 
    broadcastEventImmediate(eventData)
  ));
  
  isBroadcasting = false;
  
  // 큐에 더 있으면 다음 배치 처리
  if (broadcastQueue.length > 0) {
    setImmediate(processBroadcastQueue);
  }
}

/**
 * 즉시 브로드캐스트 (내부용)
 * @param {Object} eventData - 브로드캐스트할 이벤트 데이터
 */
async function broadcastEventImmediate(eventData) {
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  const failedClients = [];
  
  // 비동기 병렬 처리
  const writePromises = Array.from(sseClients).map(client => 
    new Promise((resolve) => {
      try {
        if (client.destroyed || client.finished) {
          failedClients.push(client);
          resolve();
          return;
        }
        
        client.write(message, (error) => {
          if (error) {
            failedClients.push(client);
          }
          resolve();
        });
      } catch (error) {
        failedClients.push(client);
        resolve();
      }
    })
  );
  
  await Promise.all(writePromises);
  
  // 실패한 클라이언트들을 정리
  failedClients.forEach(client => {
    sseClients.delete(client);
    try {
      if (!client.destroyed) {
        client.end();
      }
    } catch (error) {
      // 클라이언트 정리 실패는 조용히 처리
    }
  });
}

/**
 * 모든 SSE 클라이언트에게 이벤트 브로드캐스트 (큐 기반)
 * @param {Object} eventData - 브로드캐스트할 이벤트 데이터
 */
function broadcastEvent(eventData) {
  broadcastQueue.push(eventData);
  setImmediate(processBroadcastQueue);
}

/**
 * 풍선 클릭 이벤트 API
 * @route POST /api/balloon-click
 * @param {Object} req.body - 요청 바디
 * @param {string} req.body.balloonType - 풍선 타입
 * @param {number} req.body.clicks - 클릭 횟수
 */
app.post('/api/balloon-click', rateLimiter, (req, res) => {
  const { balloonType = 'balloon1', clicks = 1 } = req.body;
  
  // 클릭한 만큼 이벤트 생성
  for (let i = 0; i < clicks; i++) {
    const clickEvent = {
      type: 'balloon-click',
      balloonType: balloonType,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random() + i
    };
    
    broadcastEvent(clickEvent);
  }
  
  res.json({ 
    success: true,
    balloonType,
    clicks
  });
});

/**
 * understand 클릭 이벤트 API
 * @route POST /api/understand-click
 * @param {Object} req.body - 요청 바디
 * @param {number} req.body.clicks - 클릭 횟수
 */
app.post('/api/understand-click', rateLimiter, (req, res) => {
  const { clicks = 1 } = req.body;
  
  // 클릭한 만큼 이벤트 생성
  for (let i = 0; i < clicks; i++) {
    const clickEvent = {
      type: 'understand-click',
      balloonType: 'understand',
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random() + i
    };
    
    broadcastEvent(clickEvent);
  }
  
  res.json({ 
    success: true,
    balloonType: 'understand',
    clicks
  });
});

// 설정 조회 API
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    settings: appSettings
  });
});

// 설정 업데이트 API (관리자용)
app.post('/api/settings', (req, res) => {
  const { title } = req.body;
  
  if (!title || typeof title !== 'string') {
    return res.status(400).json({
      success: false,
      error: '제목이 필요합니다'
    });
  }
  
  if (title.length > TITLE_MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `제목은 ${TITLE_MAX_LENGTH}자 이하여야 합니다`
    });
  }
  
  appSettings.title = title.trim();
  
  res.json({
    success: true,
    settings: appSettings
  });
});

/**
 * 텍스트 메시지 전송 API
 * @route POST /api/send-message
 * @param {Object} req.body - 요청 바디
 * @param {string} req.body.message - 전송할 메시지
 */
app.post('/api/send-message', rateLimiter, (req, res) => {
  const { message } = req.body;
  
  // 메시지 검증
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: '메시지가 필요합니다' 
    });
  }
  
  // 메시지 길이 제한
  if (message.length > MESSAGE_MAX_LENGTH) {
    return res.status(400).json({ 
      success: false, 
      error: `메시지는 ${MESSAGE_MAX_LENGTH}자 이하여야 합니다` 
    });
  }
  
  const messageEvent = {
    type: 'text-message',
    message: message.trim(),
    timestamp: new Date().toISOString(),
    id: Date.now() + Math.random()
  };
  
  broadcastEvent(messageEvent);
  
  res.json({ 
    success: true,
    message: message.trim()
  });
});





// 사용자 접속 시작 API
app.post('/api/user-join', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: '세션 ID가 필요합니다'
    });
  }
  
  // 이미 접속 중인 세션이면 중복 카운트하지 않음
  if (!activeSessions.has(sessionId)) {
    activeSessions.add(sessionId);
    userStats.totalVisits++;
    userStats.lastVisit = new Date().toISOString();
  }
  
  userStats.currentUsers = activeSessions.size;
  
  // 관리자에게 사용자 통계 브로드캐스트
  broadcastEvent({
    type: 'user-stats-update',
    userStats
  });
  
  res.json({
    success: true,
    userStats,
    sessionId
  });
});

// 사용자 접속 종료 API
app.post('/api/user-leave', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: '세션 ID가 필요합니다'
    });
  }
  
  // activeSessions에서 해당 세션 제거
  if (activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
  }
  
  userStats.currentUsers = activeSessions.size;
  
  // 관리자에게 사용자 통계 브로드캐스트
  broadcastEvent({
    type: 'user-stats-update',
    userStats
  });
  
  res.json({
    success: true,
    userStats
  });
});

// 사용자 통계 조회 API
app.get('/api/user-stats', (req, res) => {
  res.json({
    success: true,
    userStats
  });
});

// API 상태 페이지 (React 빌드 없이)
app.get('/', (req, res) => {
  res.json({
    name: "CheerCast API Server",
    status: "running",
    version: "1.0.0",
    endpoints: {
      "GET /api/settings": "앱 설정 조회",
      "POST /api/settings": "앱 설정 변경",
      "GET /api/balloon-stream": "SSE 연결",
      "POST /api/balloon-click": "풍선 클릭 이벤트",
      "POST /api/understand-click": "understand 클릭 이벤트", 
      "POST /api/send-message": "텍스트 메시지 전송",
      "POST /api/user-join": "사용자 세션 등록",
      "POST /api/user-leave": "사용자 세션 해제",
      "GET /api/user-stats": "사용자 통계 조회"
    },
    currentUsers: userStats.currentUsers,
    totalVisits: userStats.totalVisits
  });
});

// 나머지 모든 경로는 404
app.get('*', (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "API endpoint not found",
    availableEndpoints: "/api/*"
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 CheerCast 응원봇 API 서버가 포트 ${PORT}에서 실행중입니다 (${NODE_ENV})`);
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
  console.log(`📡 SSE 엔드포인트: ${API_BASE_URL}/api/balloon-stream`);
});

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  sseClients.forEach(client => {
    try {
      client.end();
    } catch (error) {
      // 클라이언트 종료 실패 시 조용히 처리
    }
  });
  process.exit(0);
});