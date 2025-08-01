// 간단한 메모리 저장 (실제로는 데이터베이스 사용 권장)
let userStats = {
  currentUsers: 0,
  totalVisits: 0,
  lastVisit: null
};

const activeSessions = new Set();

export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    res.json({
      success: true,
      userStats
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}