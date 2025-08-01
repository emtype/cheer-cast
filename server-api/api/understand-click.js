export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { clicks = 1 } = req.body;
  
  console.log(`🎈 understand 클릭! x${clicks}`);
  
  res.json({ 
    success: true,
    balloonType: 'understand',
    clicks,
    message: 'Understand click registered'
  });
}