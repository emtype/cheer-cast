// CheerCast 응원봇 콘텐츠 스크립트

// 풍선 큐 관리
let balloonQueue = [];
let eventSource = null;

// 풍선 생성 함수
function createBalloon(balloonType) {
  console.log(`🎈 ${balloonType} 풍선 생성!`);
  
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
    console.log(`${balloonType} 이미지 로드 성공`);
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
  const sizes = ['balloon-small', 'balloon-medium', 'balloon-large'];
  const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
  balloon.classList.add(randomSize);
  
  // 랜덤한 지연 시간
  const delays = ['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5', 'delay-6', 'delay-7'];
  const randomDelay = delays[Math.floor(Math.random() * delays.length)];
  balloon.classList.add(randomDelay);
  
  // 랜덤한 시작 위치 (좌우 10% 영역)
  const isLeftSide = Math.random() < 0.5;
  const startPosition = isLeftSide 
    ? Math.random() * 10 // 0% ~ 10%
    : Math.random() * 10 + 90; // 90% ~ 100%
  balloon.style.left = startPosition + '%';
  
  // 랜덤한 애니메이션 지속시간 (12-18초)
  const duration = Math.random() * 6 + 12;
  balloon.style.animationDuration = `${duration}s, 1.5s`;
  
  console.log(`${balloonType} 풍선 시작 위치: ${startPosition}%, 지속시간: ${duration}초`);
  
  document.body.appendChild(balloon);
  
  // 애니메이션 끝나면 풍선 제거
  setTimeout(() => {
    if (balloon.parentNode) {
      balloon.parentNode.removeChild(balloon);
      console.log(`${balloonType} 풍선 제거됨`);
    }
  }, duration * 1000);
}

// 말풍선 생성 함수
function createSpeechBubble(message) {
  console.log(`💬 말풍선 생성: "${message}"`);
  
  const speechBubble = document.createElement('div');
  speechBubble.className = 'speech-bubble animated-float';
  
  // 말풍선 내용 (줄바꿈을 <br>로 변환)
  const formattedMessage = message.replace(/\n/g, '<br>');
  speechBubble.innerHTML = `
    <div class="speech-bubble-content">
      <div class="speech-bubble-text">${formattedMessage}</div>
      <div class="speech-bubble-tail"></div>
    </div>
  `;
  
  // 랜덤한 크기
  const sizes = ['speech-small', 'speech-medium', 'speech-large'];
  const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
  speechBubble.classList.add(randomSize);
  
  // 랜덤한 색상
  const colors = ['speech-color-1', 'speech-color-2', 'speech-color-3'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  speechBubble.classList.add(randomColor);
  
  // 랜덤한 지연 시간
  const delays = ['delay-1', 'delay-2', 'delay-3', 'delay-4', 'delay-5', 'delay-6', 'delay-7'];
  const randomDelay = delays[Math.floor(Math.random() * delays.length)];
  speechBubble.classList.add(randomDelay);
  
  // 랜덤한 시작 위치 (좌우 영역, 말풍선 크기 고려)
  const isLeftSide = Math.random() < 0.5;
  let startPosition;
  
  if (isLeftSide) {
    // 왼쪽: 0% ~ 10%
    startPosition = Math.random() * 10;
    speechBubble.style.left = startPosition + '%';
  } else {
    // 오른쪽: 75% ~ 85% (말풍선이 잘리지 않도록 여유 공간 확보)
    startPosition = Math.random() * 10 + 75;
    speechBubble.style.left = startPosition + '%';
  }
  
  // 랜덤한 애니메이션 지속시간 (8-12초)
  const duration = Math.random() * 4 + 8;
  speechBubble.style.animationDuration = `${duration}s`;
  
  console.log(`말풍선 시작 위치: ${startPosition}%, 지속시간: ${duration}초`);
  
  document.body.appendChild(speechBubble);
  
  // 애니메이션 끝나면 말풍선 제거
  setTimeout(() => {
    if (speechBubble.parentNode) {
      speechBubble.parentNode.removeChild(speechBubble);
      console.log(`말풍선 제거됨: "${message}"`);
    }
  }, duration * 1000);
}

// 큐에서 풍선 처리
function processBalloonQueue() {
  if (balloonQueue.length > 0) {
    const event = balloonQueue.shift();
    
    if (event.type === 'text-message') {
      createSpeechBubble(event.message);
      console.log(`큐에서 말풍선 처리: "${event.message}", 남은 큐: ${balloonQueue.length}`);
    } else {
      createBalloon(event.balloonType);
      console.log(`큐에서 풍선 처리: ${event.balloonType}, 남은 큐: ${balloonQueue.length}`);
    }
  }
  
  // 다음 풍선 처리 (500ms~1500ms 간격)
  const nextInterval = Math.random() * 1000 + 500;
  setTimeout(processBalloonQueue, nextInterval);
}

// SSE 연결 및 이벤트 수신
function connectToServer() {
  const serverUrl = 'http://localhost:3001';
  
  try {
    eventSource = new EventSource(`${serverUrl}/api/balloon-stream`);
    
    eventSource.onopen = () => {
      console.log('🔗 SSE 서버 연결 성공');
    };
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        console.log('📡 이벤트 수신:', eventData);
        
        // 이벤트를 큐에 추가
        if (eventData.type === 'balloon-click' || eventData.type === 'understand-click') {
          balloonQueue.push(eventData);
          console.log(`큐에 추가: ${eventData.balloonType}, 큐 크기: ${balloonQueue.length}`);
        } else if (eventData.type === 'text-message') {
          balloonQueue.push(eventData);
          console.log(`큐에 추가: 텍스트 메시지 "${eventData.message}", 큐 크기: ${balloonQueue.length}`);
        }
        
      } catch (error) {
        console.error('SSE 데이터 파싱 오류:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE 연결 오류:', error);
      eventSource.close();
      
      // 5초 후 재연결 시도
      setTimeout(() => {
        console.log('🔄 SSE 재연결 시도...');
        connectToServer();
      }, 5000);
    };
    
  } catch (error) {
    console.error('SSE 연결 실패:', error);
  }
}

// 풍선 애니메이션 시작
function startBalloonAnimation() {
  console.log('🎈 CheerCast 응원봇 시작!');
  console.log('현재 사이트:', window.location.hostname);
  console.log('모든 페이지에서 응원을 받을 준비 완료!');
  
  // 서버 연결
  connectToServer();
  
  // 큐 처리 시작
  processBalloonQueue();
}

// 페이지 로드 완료 후 애니메이션 시작
console.log('🎈 CheerCast 응원봇 스크립트 로드됨');

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
    console.log('🔌 SSE 연결 종료');
    eventSource.close();
  }
});