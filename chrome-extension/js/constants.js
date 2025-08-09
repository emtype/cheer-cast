// Chrome Extension 상수 정의
const ANIMATION_CONSTANTS = {
  // 애니메이션 지속시간 (초)
  BALLOON_DURATION_MIN: 12,
  BALLOON_DURATION_MAX: 18,
  SPEECH_DURATION_MIN: 8,
  SPEECH_DURATION_MAX: 12,
  
  // 위치 설정 (백분율)
  BALLOON_START_MIN: 85,
  BALLOON_START_MAX: 95,
  SPEECH_START_MIN: 70,
  SPEECH_START_MAX: 80,
  
  // 큐 처리 간격 (밀리초)
  QUEUE_INTERVAL_MIN: 500,
  QUEUE_INTERVAL_MAX: 1500,
  
  // SSE 설정
  SSE_RECONNECT_DELAY: 5000,
  
  // 서버 URL
  SERVER_URL: 'https://cheer-cast-production.up.railway.app',
  //SERVER_URL: 'http://localhost:3001',
  
  // 크기 클래스
  BALLOON_SIZES: ['balloon-small', 'balloon-medium', 'balloon-large'],
  SPEECH_SIZES: ['speech-small', 'speech-medium', 'speech-large'],
  
  // 색상 클래스
  SPEECH_COLORS: ['speech-color-1', 'speech-color-2', 'speech-color-3'],
  
  // 지연 클래스
  DELAY_CLASSES: ['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5']
};