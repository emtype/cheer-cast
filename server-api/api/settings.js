// 간단한 메모리 저장 (실제로는 데이터베이스 사용 권장)
let appSettings = {
  title: '안녕하세요'
};

export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    res.json({
      success: true,
      settings: appSettings
    });
  } else if (req.method === 'POST') {
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}