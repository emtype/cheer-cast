// 간단한 메모리 저장 (실제로는 데이터베이스 사용 권장)
let userStats = {
  currentUsers: 0,
  totalVisits: 0,
  lastVisit: null
};

const activeSessions = new Set();

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
  
  res.json({
    success: true,
    userStats,
    sessionId
  });
}