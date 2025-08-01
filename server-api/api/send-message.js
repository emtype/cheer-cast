export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
  
  console.log(`💬 텍스트 메시지: "${message}"`);
  
  res.json({ 
    success: true,
    message: message.trim()
  });
}