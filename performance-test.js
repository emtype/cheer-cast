/**
 * CheerCast Performance Test
 * 100명의 동시 사용자가 100개의 메시지를 연속으로 보내는 성능 테스트
 */

const { chromium } = require('playwright');

// 테스트 설정
const TEST_CONFIG = {
  // 사용자 및 메시지 설정
  CONCURRENT_USERS: 100,
  MESSAGES_PER_USER: 100,
  
  // 서버 설정
  SERVER_URL: 'https://cheer-cast-production.up.railway.app',
  
  // 타이밍 설정
  MESSAGE_INTERVAL_MS: 100, // 메시지 간 간격
  USER_SPAWN_INTERVAL_MS: 50, // 사용자 생성 간격
  TEST_TIMEOUT_MS: 300000, // 5분 타임아웃
  
  // 모니터링 설정
  METRICS_INTERVAL_MS: 1000, // 1초마다 메트릭 수집
};

// 전역 메트릭 수집
const metrics = {
  startTime: null,
  endTime: null,
  totalMessagesSent: 0,
  totalMessagesReceived: 0,
  successfulUsers: 0,
  failedUsers: 0,
  errors: [],
  responsetimes: [],
  serverErrors: 0,
  networkErrors: 0,
  performanceData: []
};

/**
 * 단일 사용자 시뮬레이션
 * @param {number} userId - 사용자 ID
 * @param {Object} browser - Playwright 브라우저 인스턴스
 */
async function simulateUser(userId, browser) {
  let context = null;
  let page = null;
  
  try {
    console.log(`👤 User ${userId}: Starting simulation`);
    
    // 새 브라우저 컨텍스트 생성
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: `CheerCast-TestUser-${userId}`
    });
    
    page = await context.newPage();
    
    // 네트워크 이벤트 모니터링
    let messagesReceived = 0;
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const responseTime = Date.now() - (response.request().timing?.startTime || Date.now());
        metrics.responsetimes.push(responseTime);
        
        if (response.status() >= 400) {
          metrics.serverErrors++;
          metrics.errors.push(`User ${userId}: Server error ${response.status()}`);
        }
      }
    });
    
    // 에러 모니터링
    page.on('pageerror', error => {
      metrics.errors.push(`User ${userId}: Page error - ${error.message}`);
    });
    
    // 서버 페이지로 이동
    console.log(`👤 User ${userId}: Navigating to server`);
    await page.goto(TEST_CONFIG.SERVER_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 페이지 로드 확인
    await page.waitForSelector('body', { timeout: 10000 });
    
    // 세션 등록
    const sessionId = `test-user-${userId}-${Date.now()}`;
    await registerUserSession(page, sessionId);
    
    console.log(`👤 User ${userId}: Starting to send ${TEST_CONFIG.MESSAGES_PER_USER} messages`);
    
    // 메시지 연속 전송
    for (let msgIndex = 0; msgIndex < TEST_CONFIG.MESSAGES_PER_USER; msgIndex++) {
      try {
        const message = `Test message ${msgIndex + 1} from User ${userId} at ${new Date().toISOString()}`;
        const startTime = Date.now();
        
        // 메시지 전송
        const response = await page.evaluate(async (msg) => {
          const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
          });
          return {
            ok: response.ok,
            status: response.status,
            data: await response.json()
          };
        }, message);
        
        const responseTime = Date.now() - startTime;
        metrics.responsetimes.push(responseTime);
        
        if (response.ok) {
          metrics.totalMessagesSent++;
          console.log(`✅ User ${userId}: Message ${msgIndex + 1} sent (${responseTime}ms)`);
        } else {
          metrics.serverErrors++;
          metrics.errors.push(`User ${userId}: Message ${msgIndex + 1} failed - ${response.status}`);
        }
        
        // 메시지 간 간격
        if (msgIndex < TEST_CONFIG.MESSAGES_PER_USER - 1) {
          await page.waitForTimeout(TEST_CONFIG.MESSAGE_INTERVAL_MS);
        }
        
      } catch (error) {
        metrics.networkErrors++;
        metrics.errors.push(`User ${userId}: Network error on message ${msgIndex + 1} - ${error.message}`);
      }
    }
    
    // 잠시 대기 (서버 응답 확인)
    await page.waitForTimeout(2000);
    
    // 세션 종료
    await unregisterUserSession(page, sessionId);
    
    metrics.successfulUsers++;
    console.log(`✅ User ${userId}: Completed successfully`);
    
  } catch (error) {
    metrics.failedUsers++;
    metrics.errors.push(`User ${userId}: Critical error - ${error.message}`);
    console.error(`❌ User ${userId}: Failed -`, error.message);
  } finally {
    try {
      if (page) await page.close();
      if (context) await context.close();
    } catch (error) {
      console.error(`⚠️ User ${userId}: Cleanup error -`, error.message);
    }
  }
}

/**
 * 사용자 세션 등록
 * @param {Object} page - Playwright 페이지
 * @param {string} sessionId - 세션 ID
 */
async function registerUserSession(page, sessionId) {
  try {
    await page.evaluate(async (sessionId) => {
      await fetch('/api/user-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    }, sessionId);
  } catch (error) {
    console.error('Session registration failed:', error.message);
  }
}

/**
 * 사용자 세션 해제
 * @param {Object} page - Playwright 페이지  
 * @param {string} sessionId - 세션 ID
 */
async function unregisterUserSession(page, sessionId) {
  try {
    await page.evaluate(async (sessionId) => {
      await fetch('/api/user-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    }, sessionId);
  } catch (error) {
    console.error('Session unregistration failed:', error.message);
  }
}

/**
 * 성능 메트릭 모니터링
 */
function startMetricsMonitoring() {
  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - metrics.startTime) / 1000;
    
    const snapshot = {
      timestamp: now,
      elapsed: elapsed,
      messagesSent: metrics.totalMessagesSent,
      messagesReceived: metrics.totalMessagesReceived,
      activeUsers: metrics.successfulUsers + metrics.failedUsers,
      errors: metrics.errors.length,
      avgResponseTime: metrics.responsetimes.length > 0 
        ? metrics.responsetimes.reduce((a, b) => a + b, 0) / metrics.responsetimes.length 
        : 0
    };
    
    metrics.performanceData.push(snapshot);
    
    console.log(`📊 [${elapsed.toFixed(1)}s] Messages: ${snapshot.messagesSent}, Users: ${snapshot.activeUsers}/${TEST_CONFIG.CONCURRENT_USERS}, Avg Response: ${snapshot.avgResponseTime.toFixed(1)}ms, Errors: ${snapshot.errors}`);
    
    // 테스트 완료 시 모니터링 중단
    if (metrics.endTime) {
      clearInterval(interval);
    }
  }, TEST_CONFIG.METRICS_INTERVAL_MS);
  
  return interval;
}

/**
 * 테스트 결과 리포트 생성
 */
function generateReport() {
  const duration = (metrics.endTime - metrics.startTime) / 1000;
  const messagesPerSecond = metrics.totalMessagesSent / duration;
  const avgResponseTime = metrics.responsetimes.length > 0 
    ? metrics.responsetimes.reduce((a, b) => a + b, 0) / metrics.responsetimes.length 
    : 0;
  const maxResponseTime = metrics.responsetimes.length > 0 ? Math.max(...metrics.responsetimes) : 0;
  const minResponseTime = metrics.responsetimes.length > 0 ? Math.min(...metrics.responsetimes) : 0;
  
  const report = `
🎈 CheerCast Performance Test Report
=====================================

📊 Test Configuration:
- Concurrent Users: ${TEST_CONFIG.CONCURRENT_USERS}
- Messages per User: ${TEST_CONFIG.MESSAGES_PER_USER}
- Total Expected Messages: ${TEST_CONFIG.CONCURRENT_USERS * TEST_CONFIG.MESSAGES_PER_USER}

⏱️ Timing Results:
- Test Duration: ${duration.toFixed(2)}s
- Messages Sent: ${metrics.totalMessagesSent}
- Messages/Second: ${messagesPerSecond.toFixed(2)}
- Success Rate: ${((metrics.totalMessagesSent / (TEST_CONFIG.CONCURRENT_USERS * TEST_CONFIG.MESSAGES_PER_USER)) * 100).toFixed(1)}%

👥 User Statistics:
- Successful Users: ${metrics.successfulUsers}
- Failed Users: ${metrics.failedUsers}
- Success Rate: ${((metrics.successfulUsers / TEST_CONFIG.CONCURRENT_USERS) * 100).toFixed(1)}%

🚀 Response Time Analysis:
- Average: ${avgResponseTime.toFixed(2)}ms
- Min: ${minResponseTime}ms
- Max: ${maxResponseTime}ms

❌ Error Analysis:
- Total Errors: ${metrics.errors.length}
- Server Errors (4xx/5xx): ${metrics.serverErrors}
- Network Errors: ${metrics.networkErrors}

🎯 Performance Grade: ${getPerformanceGrade(messagesPerSecond, avgResponseTime, metrics.errors.length)}

${metrics.errors.length > 0 ? `\n⚠️ Recent Errors:\n${metrics.errors.slice(-10).join('\n')}` : '✅ No errors detected!'}
`;

  console.log(report);
  return report;
}

/**
 * 성능 등급 계산
 */
function getPerformanceGrade(messagesPerSecond, avgResponseTime, errorCount) {
  if (errorCount > 100) return '❌ FAIL - Too many errors';
  if (messagesPerSecond > 50 && avgResponseTime < 500) return '🏆 EXCELLENT';
  if (messagesPerSecond > 30 && avgResponseTime < 1000) return '🎯 GOOD';
  if (messagesPerSecond > 15 && avgResponseTime < 2000) return '⚠️ FAIR';
  return '❌ POOR';
}

/**
 * 메인 테스트 실행
 */
async function runPerformanceTest() {
  console.log('🚀 Starting CheerCast Performance Test...');
  console.log(`📊 Configuration: ${TEST_CONFIG.CONCURRENT_USERS} users × ${TEST_CONFIG.MESSAGES_PER_USER} messages`);
  
  metrics.startTime = Date.now();
  
  // 메트릭 모니터링 시작
  const metricsInterval = startMetricsMonitoring();
  
  // 브라우저 실행
  const browser = await chromium.launch({
    headless: true, // 성능을 위해 헤드리스 모드
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    // 모든 사용자 시뮬레이션을 병렬로 시작
    const userPromises = [];
    
    for (let userId = 1; userId <= TEST_CONFIG.CONCURRENT_USERS; userId++) {
      // 사용자 생성 간격을 두어 서버 부하 분산
      if (userId > 1) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.USER_SPAWN_INTERVAL_MS));
      }
      
      userPromises.push(simulateUser(userId, browser));
    }
    
    console.log(`👥 ${TEST_CONFIG.CONCURRENT_USERS} users spawned, waiting for completion...`);
    
    // 모든 사용자 완료 대기 (타임아웃 적용)
    await Promise.allSettled(userPromises);
    
  } finally {
    metrics.endTime = Date.now();
    clearInterval(metricsInterval);
    
    console.log('🏁 All users completed, closing browser...');
    await browser.close();
  }
  
  // 결과 리포트 생성
  generateReport();
}

// 테스트 실행
if (require.main === module) {
  runPerformanceTest()
    .then(() => {
      console.log('✅ Performance test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTest, TEST_CONFIG, metrics };