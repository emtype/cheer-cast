// SSE 클라이언트들 관리 (메모리 내 저장 - vercel에서는 제한적)
const sseClients = new Set();

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      try {
        res.write(': ping\n\n');
      } catch (error) {
        clearInterval(pingInterval);
        sseClients.delete(res);
      }
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  // 연결 종료시 정리
  res.on('close', () => {
    clearInterval(pingInterval);
    sseClients.delete(res);
  });
}