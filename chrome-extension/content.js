// CheerCast 응원봇 콘텐츠 스크립트

/** @type {Array<Object>} 풍선 이벤트 큐 */
let balloonQueue = [];
const MAX_QUEUE_SIZE = 50; // 큐 최대 크기 제한
let isProcessing = false;
/** @type {EventSource|null} SSE 연결 객체 */
let eventSource = null;

/**
 * 배열에서 랜덤 요소를 선택하는 유틸리티 함수
 * @param {Array} array - 선택할 배열
 * @returns {*} 랜덤하게 선택된 요소
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 범위 내에서 랜덤 값을 생성하는 유틸리티 함수
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 범위 내 랜덤 값
 */
function getRandomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 큐에 이벤트를 안전하게 추가 (큐 크기 제한)
 * @param {Object} eventData - 추가할 이벤트 데이터
 */
function addToQueue(eventData) {
  // 큐가 가득 찬 경우 오래된 항목 제거
  if (balloonQueue.length >= MAX_QUEUE_SIZE) {
    balloonQueue.shift(); // 가장 오래된 항목 제거
  }
  
  balloonQueue.push(eventData);
}

/**
 * 풍선 애니메이션 요소를 생성하고 DOM에 추가
 * @param {string} balloonType - 풍선 타입 (balloon1, balloon2, etc.)
 */
function createBalloon(balloonType) {
  const balloon = document.createElement('div');
  balloon.className = 'floating-balloon animated-sway';
  
  // 이미지 생성
  const balloonImg = document.createElement('img');
  const imageUrl = chrome.runtime.getURL(`images/${balloonType}.png`);
  balloonImg.src = imageUrl;
  balloonImg.style.width = '100%';
  balloonImg.style.height = '100%';
  balloonImg.style.objectFit = 'contain';
  balloonImg.alt = `${balloonType} balloon`;
  
  // 이미지 로드 처리
  balloonImg.onload = () => {
    // 이미지 로드 성공
  };
  balloonImg.onerror = (error) => {
    console.error(`${balloonType} 이미지 로드 실패:`, error);
    // 폴백 이모지
    balloon.innerHTML = balloonType === 'understand' ? '💭' : '🎈';
    balloon.style.fontSize = '60px';
    balloon.style.display = 'flex';
    balloon.style.alignItems = 'center';
    balloon.style.justifyContent = 'center';
  };
  
  balloon.appendChild(balloonImg);
  
  // 랜덤한 크기
  const randomSize = getRandomElement(ANIMATION_CONSTANTS.BALLOON_SIZES);
  balloon.classList.add(randomSize);
  
  // 랜덤한 지연 시간
  const randomDelay = getRandomElement(ANIMATION_CONSTANTS.DELAY_CLASSES);
  balloon.classList.add(randomDelay);
  
  // 오른쪽에서만 시작
  const startPosition = getRandomInRange(ANIMATION_CONSTANTS.BALLOON_START_MIN, ANIMATION_CONSTANTS.BALLOON_START_MAX);
  balloon.style.left = startPosition + '%';
  
  // 랜덤한 애니메이션 지속시간
  const duration = getRandomInRange(ANIMATION_CONSTANTS.BALLOON_DURATION_MIN, ANIMATION_CONSTANTS.BALLOON_DURATION_MAX);
  balloon.style.animationDuration = `${duration}s, 1.5s`;
  
  document.body.appendChild(balloon);
  
  // 애니메이션 끝나면 풍선 제거
  setTimeout(() => {
    if (balloon.parentNode) {
      balloon.parentNode.removeChild(balloon);
    }
  }, duration * 1000);
}

/**
 * HTML 태그를 안전하게 이스케이프하는 함수
 * @param {string} text - 이스케이프할 텍스트
 * @returns {string} 이스케이프된 텍스트
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 말풍선 애니메이션 요소를 생성하고 DOM에 추가
 * @param {string} message - 표시할 메시지 텍스트
 */
function createSpeechBubble(message) {
  const speechBubble = document.createElement('div');
  speechBubble.className = 'speech-bubble animated-float';
  
  // HTML 이스케이프 후 줄바꿈을 <br>로 변환
  const sanitizedMessage = escapeHtml(message);
  const formattedMessage = sanitizedMessage.replace(/\n/g, '<br>');
  speechBubble.innerHTML = `
    <div class="speech-bubble-content">
      <div class="speech-bubble-text">${formattedMessage}</div>
      <div class="speech-bubble-tail"></div>
    </div>
  `;
  
  // 랜덤한 크기
  const randomSize = getRandomElement(ANIMATION_CONSTANTS.SPEECH_SIZES);
  speechBubble.classList.add(randomSize);
  
  // 랜덤한 색상
  const randomColor = getRandomElement(ANIMATION_CONSTANTS.SPEECH_COLORS);
  speechBubble.classList.add(randomColor);
  
  // 랜덤한 지연 시간
  const randomDelay = getRandomElement(ANIMATION_CONSTANTS.DELAY_CLASSES);
  speechBubble.classList.add(randomDelay);
  
  // 오른쪽에서만 시작
  const startPosition = getRandomInRange(ANIMATION_CONSTANTS.SPEECH_START_MIN, ANIMATION_CONSTANTS.SPEECH_START_MAX);
  speechBubble.style.left = startPosition + '%';
  
  // 랜덤한 애니메이션 지속시간
  const duration = getRandomInRange(ANIMATION_CONSTANTS.SPEECH_DURATION_MIN, ANIMATION_CONSTANTS.SPEECH_DURATION_MAX);
  speechBubble.style.animationDuration = `${duration}s`;
  
  document.body.appendChild(speechBubble);
  
  // 애니메이션 끝나면 말풍선 제거
  setTimeout(() => {
    if (speechBubble.parentNode) {
      speechBubble.parentNode.removeChild(speechBubble);
    }
  }, duration * 1000);
}

/**
 * 풍선 큐를 배치로 처리하고 다음 처리를 예약
 */
function processBalloonQueue() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  // 큐가 너무 크면 배치 처리
  const batchSize = balloonQueue.length > 20 ? 5 : 1;
  const eventsToProcess = balloonQueue.splice(0, batchSize);
  
  eventsToProcess.forEach((event, index) => {
    // 짧은 지연으로 순차 처리
    setTimeout(() => {
      if (event.type === 'text-message') {
        createSpeechBubble(event.message);
      } else {
        createBalloon(event.balloonType);
      }
    }, index * 100); // 100ms 간격
  });
  
  isProcessing = false;
  
  // 다음 풍선 처리 (큐가 많으면 빠르게)
  const nextInterval = balloonQueue.length > 10 ? 200 : 
                      getRandomInRange(ANIMATION_CONSTANTS.QUEUE_INTERVAL_MIN, ANIMATION_CONSTANTS.QUEUE_INTERVAL_MAX);
  setTimeout(processBalloonQueue, nextInterval);
}

// SSE 연결 및 이벤트 수신
function connectToServer() {
  try {
    eventSource = new EventSource(`${ANIMATION_CONSTANTS.SERVER_URL}/api/balloon-stream`);
    
    eventSource.onopen = () => {
      // SSE 서버 연결 성공
    };
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        // 이벤트를 큐에 추가 (큐 크기 제한)
        if (eventData.type === 'balloon-click' || eventData.type === 'understand-click') {
          addToQueue(eventData);
        } else if (eventData.type === 'text-message') {
          addToQueue(eventData);
        }
        
      } catch (error) {
        console.error('SSE 데이터 파싱 오류:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE 연결 오류:', error);
      eventSource.close();
      
      // 재연결 시도
      setTimeout(() => {
        connectToServer();
      }, ANIMATION_CONSTANTS.SSE_RECONNECT_DELAY);
    };
    
  } catch (error) {
    console.error('SSE 연결 실패:', error);
  }
}

/**
 * 현재 페이지가 허용된 PDF인지 확인
 * @returns {boolean} 허용된 페이지인지 여부
 */
function isAllowedPage() {
  const currentUrl = window.location.href;
  
  // 로컬 PDF 파일인지 확인
  if (!currentUrl.startsWith('file://') || !currentUrl.endsWith('.pdf')) {
    return false;
  }
  
  // 특정 키워드가 포함된 파일명만 허용 (선택사항)
  const allowedKeywords = [
    'presentation', 'vibe', 'coding', '발표', '프레젠테이션',
    // 필요한 키워드들을 여기에 추가
  ];
  
  // 키워드 체크 (대소문자 구분 없음)
  const fileName = currentUrl.toLowerCase();
  const hasAllowedKeyword = allowedKeywords.some(keyword => 
    fileName.includes(keyword.toLowerCase())
  );
  
  // 키워드가 있거나, 개발 모드에서는 모든 PDF 허용
  const isDevelopment = currentUrl.includes('/presentation/') || 
                       currentUrl.includes('/test/') ||
                       currentUrl.includes('/demo/');
  
  return hasAllowedKeyword || isDevelopment;
}

// 풍선 애니메이션 시작
function startBalloonAnimation() {
  // 허용된 페이지에서만 실행
  if (!isAllowedPage()) {
    console.log('CheerCast: 허용되지 않은 페이지입니다.');
    return;
  }
  
  // 서버 연결
  connectToServer();
  
  // 큐 처리 시작
  processBalloonQueue();
}

// 페이지 로드 완료 후 애니메이션 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(startBalloonAnimation, 1000);
  });
} else {
  setTimeout(startBalloonAnimation, 1000);
}

// 페이지 종료 시 SSE 연결 정리
window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
});