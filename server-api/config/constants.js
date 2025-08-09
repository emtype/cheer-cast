// 애플리케이션 상수 정의
module.exports = {
  // 메시지 및 제목 길이 제한
  MESSAGE_MAX_LENGTH: 120,
  TITLE_MAX_LENGTH: 50,
  
  // 애니메이션 타이밍
  BALLOON_DURATION_MIN: 12, // 초
  BALLOON_DURATION_MAX: 18, // 초
  SPEECH_DURATION_MIN: 8,   // 초
  SPEECH_DURATION_MAX: 12,  // 초
  
  // 위치 설정 (백분율)
  BALLOON_START_MIN: 85,
  BALLOON_START_MAX: 95,
  SPEECH_START_MIN: 70,
  SPEECH_START_MAX: 80,
  
  // 큐 처리 간격 (밀리초)
  QUEUE_INTERVAL_MIN: 500,
  QUEUE_INTERVAL_MAX: 1500,
  
  // SSE 설정
  SSE_PING_INTERVAL: 30000, // 30초
  SSE_RECONNECT_DELAY: 5000, // 5초
  
  // 기본값
  DEFAULT_TITLE: '안녕하세요',
  
  // 서버 설정
  DEFAULT_PORT: 3001
};