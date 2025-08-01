const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false // SSE를 위해 CSP 비활성화
}));
app.use(cors({
  origin: ['http://localhost:3000', 'https://naver.com', 'https://*.naver.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// SSE 클라이언트들 관리
const sseClients = new Set();

// 사용자 접속 통계 관리
const activeSessions = new Set(); // 활성 세션 ID들을 저장
let userStats = {
  currentUsers: 0,
  totalVisits: 0,
  lastVisit: null
};

// 앱 설정 관리
let appSettings = {
  title: '안녕하세요'
};

// 풍선 상태 관리
let balloonState = {
  lastUpdated: new Date().toISOString()
};

// SSE 연결 엔드포인트
app.get('/api/balloon-stream', (req, res) => {
  console.log('새로운 SSE 클라이언트 연결');
  
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

  // 연결이 끊어졌을 때 정리
  req.on('close', () => {
    console.log('SSE 클라이언트 연결 종료');
    sseClients.delete(res);
  });

  // Keep-alive ping (30초마다)
  const pingInterval = setInterval(() => {
    if (sseClients.has(res)) {
      res.write(': ping\n\n');
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

// 모든 SSE 클라이언트에게 이벤트 브로드캐스트
function broadcastEvent(eventData) {
  const message = `data: ${JSON.stringify(eventData)}\n\n`;
  console.log('브로드캐스트 이벤트:', eventData);
  
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('클라이언트 전송 실패:', error);
      sseClients.delete(client);
    }
  });
}

// 풍선 클릭 이벤트
app.post('/api/balloon-click', (req, res) => {
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
  
  console.log(`🎈 풍선 클릭! ${balloonType} x${clicks}`);
  
  res.json({ 
    success: true,
    balloonType,
    clicks
  });
});

// understand 클릭 이벤트
app.post('/api/understand-click', (req, res) => {
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
  
  console.log(`🎈 understand 클릭! x${clicks}`);
  
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
  
  if (title.length > 50) {
    return res.status(400).json({
      success: false,
      error: '제목은 50자 이하여야 합니다'
    });
  }
  
  appSettings.title = title.trim();
  
  console.log(`⚙️ 설정 업데이트: 제목 = "${appSettings.title}"`);
  
  res.json({
    success: true,
    settings: appSettings
  });
});

// 텍스트 메시지 전송 이벤트
app.post('/api/send-message', (req, res) => {
  const { message } = req.body;
  
  // 메시지 검증
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: '메시지가 필요합니다' 
    });
  }
  
  // 120자 제한
  if (message.length > 120) {
    return res.status(400).json({ 
      success: false, 
      error: '메시지는 120자 이하여야 합니다' 
    });
  }
  
  const messageEvent = {
    type: 'text-message',
    message: message.trim(),
    timestamp: new Date().toISOString(),
    id: Date.now() + Math.random()
  };
  
  broadcastEvent(messageEvent);
  
  console.log(`💬 텍스트 메시지: "${message}"`);
  
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
  
  console.log(`👤 사용자 접속 (${sessionId}): 현재 ${userStats.currentUsers}명 온라인`);
  
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
  
  console.log(`👤 사용자 퇴장 (${sessionId}): 현재 ${userStats.currentUsers}명 온라인`);
  
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

// React 앱 서빙 (프로덕션)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'client/build', 'index.html');
  
  // 빌드 파일이 존재하는지 확인
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // 빌드 파일이 없으면 개발 안내 메시지 표시
    res.send(`
      <html>
        <head><title>Cheer Cast API</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>🎈 CheerCast 응원봇 API Server</h1>
          <p>CheerCast API 서버가 실행 중입니다!</p>
          <h2>API 엔드포인트</h2>
          <ul style="text-align: left; display: inline-block;">
            <li>GET /api/balloon-stream - SSE 연결</li>
            <li>POST /api/balloon-click - 풍선 클릭</li>
            <li>POST /api/understand-click - understand 클릭</li>
            <li>POST /api/send-message - 텍스트 메시지 전송</li>
          </ul>
        </body>
      </html>
    `);
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 CheerCast 응원봇 API 서버가 포트 ${PORT}에서 실행중입니다`);
  console.log(`📡 SSE 엔드포인트: http://localhost:${PORT}/api/balloon-stream`);
});

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
  console.log('서버 종료 중...');
  sseClients.forEach(client => {
    try {
      client.end();
    } catch (error) {
      console.error('클라이언트 종료 실패:', error);
    }
  });
  process.exit(0);
});