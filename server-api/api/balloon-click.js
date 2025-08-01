export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { balloonType = 'balloon1', clicks = 1 } = req.body;
  
  console.log(`🎈 풍선 클릭! ${balloonType} x${clicks}`);
  
  // 이벤트 시스템에 클릭 이벤트 추가
  try {
    const eventData = {
      type: 'balloon-click',
      data: {
        balloonType,
        clicks,
        timestamp: new Date().toISOString()
      }
    };
    
    // events API 호출 (같은 도메인이므로 내부 호출)
    await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
  } catch (error) {
    console.error('이벤트 추가 실패:', error);
  }
  
  res.json({ 
    success: true,
    balloonType,
    clicks,
    message: 'Click registered'
  });
}