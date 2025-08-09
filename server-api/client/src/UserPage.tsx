import React, { useState, useEffect } from 'react';

interface UserStats {
  currentUsers: number;
  totalVisits: number;
  lastVisit: string | null;
}

function UserPage() {
  const [connected, setConnected] = useState(false);
  const [isClicking, setIsClicking] = useState<string | null>(null);
  const [totalClicks, setTotalClicks] = useState(0);
  const [showUnderstandButton, setShowUnderstandButton] = useState(false);
  const [eventCount, setEventCount] = useState(() => {
    // 로컬 스토리지에서 풍선 카운트 불러오기
    const saved = localStorage.getItem('balloonEventCount');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // 현재 표시될 풍선 타입 (랜덤하게 변경됨)
  const [currentBalloonType, setCurrentBalloonType] = useState('balloon1');
  
  // 텍스트 메시지 상태
  const [textMessage, setTextMessage] = useState('');
  const [isSendingText, setIsSendingText] = useState(false);
  const [appTitle, setAppTitle] = useState('안녕하세요');
  const [userStats, setUserStats] = useState<UserStats>({
    currentUsers: 0,
    totalVisits: 0,
    lastVisit: null
  });
  
  // 세션 ID 생성 (탭마다 고유, 새로고침해도 유지)
  const [sessionId] = useState(() => {
    // sessionStorage에서 기존 세션 ID 확인
    let existingSessionId = sessionStorage.getItem('cheer-cast-session-id');
    
    if (!existingSessionId) {
      // 없으면 새로 생성하고 저장
      existingSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('cheer-cast-session-id', existingSessionId);
    }
    
    return existingSessionId;
  });

  useEffect(() => {
    // 사용자 접속 시작 알림
    const notifyUserJoin = async () => {
      try {
        await fetch('/api/user-join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId })
        });
        console.log(`👤 사용자 접속 알림 전송 (${sessionId})`);
      } catch (error) {
        console.error('사용자 접속 알림 실패:', error);
      }
    };

    // 앱 설정 불러오기
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.settings) {
            setAppTitle(data.settings.title);
          }
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      }
    };

    // 사용자 통계 불러오기
    const loadUserStats = async () => {
      try {
        const response = await fetch('/api/user-stats');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.userStats) {
            setUserStats(data.userStats);
          }
        }
      } catch (error) {
        console.error('사용자 통계 불러오기 실패:', error);
      }
    };
    
    notifyUserJoin();
    loadSettings();
    loadUserStats();
    
    // SSE 연결
    const eventSource = new EventSource('/api/balloon-stream');
    
    eventSource.onopen = () => {
      console.log('유저 페이지 SSE 연결 성공');
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        // 풍선 카운트 증가 및 로컬 스토리지 저장
        if (eventData.type === 'balloon-click' || eventData.type === 'understand-click') {
          setEventCount(prev => {
            const newCount = prev + 1;
            localStorage.setItem('balloonEventCount', newCount.toString());
            return newCount;
          });
        } else if (eventData.type === 'user-stats-update') {
          setUserStats(eventData.userStats);
        }
      } catch (error) {
        console.error('SSE 데이터 파싱 오류:', error);
      }
    };
    
    eventSource.onerror = () => {
      console.error('SSE 연결 오류');
      setConnected(false);
    };
    
    // 페이지가 완전히 언로드될 때 세션 정리
    const handleBeforeUnload = () => {
      // sessionStorage 정리 (탭 닫기 시에만)
      sessionStorage.removeItem('cheer-cast-session-id');
      
      // 서버에 세션 종료 알림 (동기적으로)
      const data = new Blob([JSON.stringify({ sessionId })], {
        type: 'application/json'
      });
      navigator.sendBeacon('/api/user-leave', data);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      eventSource.close();
    };
  }, [sessionId]);

  const createClickEffect = (event: React.MouseEvent, balloonType: string) => {
    const button = event.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 파티클 효과 생성
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'click-particle';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.setProperty('--random-x', `${(Math.random() - 0.5) * 100}px`);
      particle.style.setProperty('--random-y', `${(Math.random() - 0.5) * 100}px`);
      particle.textContent = '🎈';
      
      button.appendChild(particle);
      
      // 1초 후 파티클 제거
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1000);
    }
  };

  const showBalloonCounter = () => {
    const counter = document.querySelector('.balloon-counter') as HTMLElement;
    if (counter) {
      counter.classList.remove('counter-animation');
      void counter.offsetHeight; // Reflow를 강제로 발생시켜 애니메이션 리셋
      counter.classList.add('counter-animation');
      
      // 애니메이션 완료 후 클래스 제거
      setTimeout(() => {
        counter.classList.remove('counter-animation');
      }, 1500);
    }
  };

  const handleBalloonClick = async (balloonType: string, event: React.MouseEvent) => {
    if (isClicking) return; // 중복 클릭 방지

    setIsClicking(balloonType);
    createClickEffect(event, balloonType);
    
    try {
      const response = await fetch('/api/balloon-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ balloonType: currentBalloonType, clicks: 1 }),
      });
      
      if (!response.ok) {
        throw new Error('풍선 클릭 처리 실패');
      }
      
      // const result = await response.json(); // 현재 사용하지 않음
      
      // 다음 클릭을 위해 새로운 랜덤 풍선 타입 설정
      const nextBalloonType = `balloon${Math.floor(Math.random() * 6) + 1}`;
      setCurrentBalloonType(nextBalloonType);
      
      // 이벤트 카운트 증가 (누적 카운터용)
      setEventCount(prev => {
        const newCount = prev + 1;
        localStorage.setItem('balloonEventCount', newCount.toString());
        // 새로운 카운트로 애니메이션 표시
        setTimeout(() => showBalloonCounter(), 50);
        return newCount;
      });
      
      // 클릭 카운트 증가
      const newClickCount = totalClicks + 1;
      setTotalClicks(newClickCount);
      
      // 10번 클릭 시 understand 버튼 표시
      if (newClickCount >= 10 && !showUnderstandButton) {
        setShowUnderstandButton(true);        
      }
      
    } catch (error) {
      console.error('풍선 클릭 오류:', error);
    } finally {
      setTimeout(() => setIsClicking(null), 200); // 200ms 후 클릭 가능
    }
  };

  const handleUnderstandClick = async (event: React.MouseEvent) => {
    if (isClicking) return; // 중복 클릭 방지

    setIsClicking('understand');
    createClickEffect(event, 'understand');
    
    try {
      const response = await fetch('/api/understand-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clicks: 1 }),
      });
      
      if (!response.ok) {
        throw new Error('understand 클릭 처리 실패');
      }
      
      const result = await response.json();
      console.log('understand 클릭 성공:', result);
      
      // understand 버튼 클릭 후 숨기고 카운트 리셋
      setShowUnderstandButton(false);
      setTotalClicks(0);
      console.log('🔄 understand 버튼 숨김, 클릭 카운트 리셋');
      
    } catch (error) {
      console.error('understand 클릭 오류:', error);
    } finally {
      setTimeout(() => setIsClicking(null), 200); // 200ms 후 클릭 가능
    }
  };

  const handleTextMessageSend = async () => {
    if (!textMessage.trim() || isSendingText) return;

    setIsSendingText(true);
    
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: textMessage.trim() }),
      });
      
      if (!response.ok) {
        throw new Error('텍스트 메시지 전송 실패');
      }
      
      const result = await response.json();
      console.log('텍스트 메시지 전송 성공:', result);
      
      // 입력 필드 초기화
      setTextMessage('');
      
      // 이벤트 카운트 증가
      setEventCount(prev => {
        const newCount = prev + 1;
        localStorage.setItem('balloonEventCount', newCount.toString());
        return newCount;
      });
      
    } catch (error) {
      console.error('텍스트 메시지 전송 오류:', error);
    } finally {
      setIsSendingText(false);
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 120) {
      setTextMessage(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        // Shift+Enter, Ctrl+Enter, Cmd+Enter: 메시지 전송
        e.preventDefault();
        handleTextMessageSend();
      } else {
        // Enter: 새 줄 추가 (기본 동작, 최대 5줄까지)
        const lines = textMessage.split('\n').length;
        if (lines >= 5) {
          e.preventDefault(); // 5줄 이상이면 새 줄 추가 방지
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black font-sans">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-[20px] border-b border-gray-700/50 p-6 text-center relative">
        {/* 우상단 접속자 수 */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6">
          <div className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium bg-gray-700/80 backdrop-blur-sm border border-gray-600/50 text-gray-200 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50"></div>
            <span className="text-xs md:text-sm">👤 {userStats.currentUsers}명 접속중</span>
          </div>
        </div>
        
        <h1 className="text-5xl font-semibold text-white mb-4 tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          {appTitle}
        </h1>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 text-gray-200 ${
          connected ? '' : ''
        }`}>
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            connected 
              ? 'bg-green-400 shadow-lg shadow-green-400/50' 
              : 'bg-red-400 shadow-lg shadow-red-400/50'
          }`}></div>
          {connected ? '연결됨' : '연결 끊어짐'}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-5 max-w-4xl mx-auto">

        {/* Text Message Section */}
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-3xl p-4 md:p-8 shadow-2xl border border-gray-700/50">
          
          {/* 텍스트 입력창 */}
          <div className="mb-4">
            <div className="flex-1 relative">
              <textarea
                value={textMessage}
                onChange={handleTextInputChange}
                onKeyDown={handleKeyPress}
                placeholder="메시지 입력..."
                disabled={isSendingText}
                rows={1}
                className={`w-full px-4 py-3 md:px-6 md:py-4 text-base md:text-lg bg-gray-700/50 border-2 border-gray-600 rounded-2xl focus:outline-none focus:border-gray-400 focus:bg-gray-700/80 transition-all duration-200 placeholder-gray-400 text-white resize-none overflow-hidden ${
                  isSendingText ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                style={{ 
                  minHeight: '48px',
                  maxHeight: '120px', // 모바일에서 더 컴팩하게
                  lineHeight: '24px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px'; // 모바일 초기 높이
                  const scrollHeight = Math.min(target.scrollHeight, 120); // 모바일 최대 높이
                  target.style.height = scrollHeight + 'px';
                }}
              />
              <div className="absolute right-3 bottom-2 text-xs md:text-sm text-gray-400 bg-gray-800/80 px-2 py-1 rounded-full">
                {textMessage.length}/120
              </div>
            </div>
          </div>
          
          {/* 풍선 버튼과 전송 버튼 */}
          <div className="flex items-center justify-between">
            {/* 왼쪽: 풍선 버튼들 */}
            <div className="flex items-center gap-4">
              {/* Main Balloon Button */}
              <div className="relative">
                {/* Counter Animation with Speech Bubble */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 balloon-counter z-20">
                  <div className="relative bg-gray-900 text-white font-bold text-sm px-3 py-2 rounded-xl shadow-lg border border-gray-600">
                    {eventCount}
                    {/* 말풍선 꼬리 */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              
              <button
                className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-gray-600 to-gray-700 border border-gray-500/50 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg shadow-gray-700/30 relative group hover:from-gray-500 hover:to-gray-600
                  ${isClicking === 'balloon' ? 'scale-95' : 'hover:scale-110 hover:shadow-xl hover:shadow-gray-600/40'}
                  ${isClicking !== null ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                onClick={(e) => handleBalloonClick('balloon', e)}
                disabled={isClicking !== null}
              >
                <div className="flex items-center justify-center h-full">
                  <img 
                    src={`/images/${currentBalloonType}.png`} 
                    alt={currentBalloonType}
                    className={`w-6 h-6 md:w-10 md:h-10 object-contain transition-transform duration-200 ${
                      isClicking === 'balloon' ? 'scale-95 rotate-1 brightness-125' : 'group-hover:scale-110'
                    }`}
                    style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))' }}
                  />
                </div>
              </button>
              </div>
              
              {/* Understand Button */}
              {showUnderstandButton && (
                <button
                  className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-gray-500 to-gray-600 border border-gray-400/50 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg shadow-gray-600/30 relative overflow-hidden animate-pulse hover:from-gray-400 hover:to-gray-500
                    ${isClicking === 'understand' ? 'scale-95' : 'hover:scale-110 hover:shadow-xl hover:shadow-gray-500/50'}
                    ${isClicking !== null ? 'opacity-60 cursor-not-allowed' : ''}
                  `}
                  onClick={(e) => handleUnderstandClick(e)}
                  disabled={isClicking !== null}
                >
                  <div className="flex items-center justify-center h-full">
                    <img 
                      src="/images/understand.png" 
                      alt="understand"
                      className={`w-6 h-6 md:w-10 md:h-10 object-contain transition-transform duration-200 ${
                        isClicking === 'understand' ? 'scale-95 rotate-1 brightness-125' : 'hover:scale-110'
                      }`}
                      style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))' }}
                    />
                  </div>
                </button>
              )}
            </div>
            
            {/* 오른쪽: 전송 버튼 */}
            <button
              onClick={handleTextMessageSend}
              disabled={!textMessage.trim() || isSendingText}
              className={`px-4 py-3 md:px-8 md:py-4 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg text-sm md:text-base border border-gray-600/50 hover:from-gray-600 hover:to-gray-700
                ${!textMessage.trim() || isSendingText 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-105 hover:shadow-xl hover:shadow-gray-700/30 active:scale-95'
                }
              `}
            >
              {isSendingText ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="hidden md:inline">전송중...</span>
                  <span className="md:hidden">전송...</span>
                </div>
              ) : (
                '전송'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserPage;