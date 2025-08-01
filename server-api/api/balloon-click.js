export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { balloonType = 'balloon1', clicks = 1 } = req.body;
  
  console.log(`🎈 풍선 클릭! ${balloonType} x${clicks}`);
  
  // 실제 프로덕션에서는 브로드캐스트 로직이 필요하지만
  // vercel serverless에서는 메모리 공유가 어려움
  
  res.json({ 
    success: true,
    balloonType,
    clicks,
    message: 'Click registered'
  });
}