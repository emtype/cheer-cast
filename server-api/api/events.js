// 간단한 이벤트 저장소 (메모리 내 저장)
let events = [];
let eventId = 0;

export default function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    // 이벤트 조회
    const { since } = req.query;
    const sinceId = since ? parseInt(since) : 0;
    
    // since ID 이후의 이벤트들만 반환
    const newEvents = events.filter(event => event.id > sinceId);
    
    res.json({
      success: true,
      events: newEvents,
      lastEventId: events.length > 0 ? events[events.length - 1].id : 0
    });
    
  } else if (req.method === 'POST') {
    // 새 이벤트 추가
    const { type, data } = req.body;
    
    const newEvent = {
      id: ++eventId,
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    events.push(newEvent);
    
    // 최근 100개 이벤트만 유지
    if (events.length > 100) {
      events = events.slice(-100);
    }
    
    console.log(`새 이벤트 추가: ${type}`, data);
    
    res.json({
      success: true,
      event: newEvent
    });
    
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}