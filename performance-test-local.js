/**
 * CheerCast Local Performance Test
 * 로컬 서버 (localhost:3001) 테스트용
 */

const { chromium } = require('playwright');

// 로컬 테스트 설정
const LOCAL_CONFIG = {
  CONCURRENT_USERS: 20, // 로컬 테스트는 적은 수로 시작
  MESSAGES_PER_USER: 20,
  SERVER_URL: 'http://localhost:3001',
  MESSAGE_INTERVAL_MS: 100,
  USER_SPAWN_INTERVAL_MS: 100,
  TEST_TIMEOUT_MS: 120000, // 2분
  METRICS_INTERVAL_MS: 1000,
};

const localMetrics = {
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
 * 로컬 사용자 시뮬레이션
 */
async function simulateLocalUser(userId, browser) {
  let context = null;
  let page = null;
  
  try {
    console.log(`👤 Local User ${userId}: Starting simulation`);
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: `CheerCast-LocalTestUser-${userId}`
    });
    
    page = await context.newPage();
    
    // 네트워크 이벤트 모니터링
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const responseTime = Date.now() - (response.request().timing?.startTime || Date.now());
        localMetrics.responsetimes.push(responseTime);
        
        if (response.status() >= 400) {
          localMetrics.serverErrors++;
          localMetrics.errors.push(`User ${userId}: Server error ${response.status()}`);
        }
      }
    });
    
    page.on('pageerror', error => {
      localMetrics.errors.push(`User ${userId}: Page error - ${error.message}`);
    });
    
    // 로컬 서버로 이동
    console.log(`👤 Local User ${userId}: Navigating to ${LOCAL_CONFIG.SERVER_URL}`);
    await page.goto(LOCAL_CONFIG.SERVER_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForSelector('body', { timeout: 10000 });
    
    // 세션 등록
    const sessionId = `local-test-user-${userId}-${Date.now()}`;
    await registerUserSession(page, sessionId);
    
    console.log(`👤 Local User ${userId}: Starting to send ${LOCAL_CONFIG.MESSAGES_PER_USER} messages`);
    
    // 메시지 연속 전송
    for (let msgIndex = 0; msgIndex < LOCAL_CONFIG.MESSAGES_PER_USER; msgIndex++) {
      try {
        const message = `🎈 Local test message ${msgIndex + 1} from User ${userId} at ${new Date().toLocaleTimeString()}`;
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
        localMetrics.responsetimes.push(responseTime);
        
        if (response.ok) {
          localMetrics.totalMessagesSent++;
          console.log(`✅ Local User ${userId}: Message ${msgIndex + 1} sent (${responseTime}ms)`);
        } else {
          localMetrics.serverErrors++;
          localMetrics.errors.push(`User ${userId}: Message ${msgIndex + 1} failed - ${response.status}`);
        }
        
        // 메시지 간 간격
        if (msgIndex < LOCAL_CONFIG.MESSAGES_PER_USER - 1) {
          await page.waitForTimeout(LOCAL_CONFIG.MESSAGE_INTERVAL_MS);
        }
        
      } catch (error) {
        localMetrics.networkErrors++;
        localMetrics.errors.push(`User ${userId}: Network error on message ${msgIndex + 1} - ${error.message}`);
      }
    }
    
    // 잠시 대기
    await page.waitForTimeout(2000);
    
    // 세션 종료
    await unregisterUserSession(page, sessionId);
    
    localMetrics.successfulUsers++;
    console.log(`✅ Local User ${userId}: Completed successfully`);
    
  } catch (error) {
    localMetrics.failedUsers++;
    localMetrics.errors.push(`User ${userId}: Critical error - ${error.message}`);
    console.error(`❌ Local User ${userId}: Failed -`, error.message);
  } finally {
    try {
      if (page) await page.close();
      if (context) await context.close();
    } catch (error) {
      console.error(`⚠️ Local User ${userId}: Cleanup error -`, error.message);
    }
  }
}

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

function startLocalMetricsMonitoring() {
  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - localMetrics.startTime) / 1000;
    
    const snapshot = {
      timestamp: now,
      elapsed: elapsed,
      messagesSent: localMetrics.totalMessagesSent,
      activeUsers: localMetrics.successfulUsers + localMetrics.failedUsers,
      errors: localMetrics.errors.length,
      avgResponseTime: localMetrics.responsetimes.length > 0 
        ? localMetrics.responsetimes.reduce((a, b) => a + b, 0) / localMetrics.responsetimes.length 
        : 0
    };
    
    localMetrics.performanceData.push(snapshot);
    
    console.log(`📊 [${elapsed.toFixed(1)}s] Messages: ${snapshot.messagesSent}, Users: ${snapshot.activeUsers}/${LOCAL_CONFIG.CONCURRENT_USERS}, Avg Response: ${snapshot.avgResponseTime.toFixed(1)}ms, Errors: ${snapshot.errors}`);
    
    if (localMetrics.endTime) {
      clearInterval(interval);
    }
  }, LOCAL_CONFIG.METRICS_INTERVAL_MS);
  
  return interval;
}

function generateLocalReport() {
  const duration = (localMetrics.endTime - localMetrics.startTime) / 1000;
  const messagesPerSecond = localMetrics.totalMessagesSent / duration;
  const avgResponseTime = localMetrics.responsetimes.length > 0 
    ? localMetrics.responsetimes.reduce((a, b) => a + b, 0) / localMetrics.responsetimes.length 
    : 0;
  const maxResponseTime = localMetrics.responsetimes.length > 0 ? Math.max(...localMetrics.responsetimes) : 0;
  const minResponseTime = localMetrics.responsetimes.length > 0 ? Math.min(...localMetrics.responsetimes) : 0;
  
  const report = `
🎈 CheerCast Local Performance Test Report
==========================================

📊 Test Configuration:
- Concurrent Users: ${LOCAL_CONFIG.CONCURRENT_USERS}
- Messages per User: ${LOCAL_CONFIG.MESSAGES_PER_USER}
- Server: ${LOCAL_CONFIG.SERVER_URL}
- Total Expected Messages: ${LOCAL_CONFIG.CONCURRENT_USERS * LOCAL_CONFIG.MESSAGES_PER_USER}

⏱️ Timing Results:
- Test Duration: ${duration.toFixed(2)}s
- Messages Sent: ${localMetrics.totalMessagesSent}
- Messages/Second: ${messagesPerSecond.toFixed(2)}
- Success Rate: ${((localMetrics.totalMessagesSent / (LOCAL_CONFIG.CONCURRENT_USERS * LOCAL_CONFIG.MESSAGES_PER_USER)) * 100).toFixed(1)}%

👥 User Statistics:
- Successful Users: ${localMetrics.successfulUsers}
- Failed Users: ${localMetrics.failedUsers}
- Success Rate: ${((localMetrics.successfulUsers / LOCAL_CONFIG.CONCURRENT_USERS) * 100).toFixed(1)}%

🚀 Response Time Analysis:
- Average: ${avgResponseTime.toFixed(2)}ms
- Min: ${minResponseTime}ms
- Max: ${maxResponseTime}ms

❌ Error Analysis:
- Total Errors: ${localMetrics.errors.length}
- Server Errors (4xx/5xx): ${localMetrics.serverErrors}
- Network Errors: ${localMetrics.networkErrors}

💡 Chrome Extension Test Ready!
이제 Chrome Extension을 켜고 ${LOCAL_CONFIG.SERVER_URL}에서 
실시간 풍선 애니메이션을 확인해보세요! 🎈

${localMetrics.errors.length > 0 ? `\n⚠️ Recent Errors:\n${localMetrics.errors.slice(-5).join('\n')}` : '✅ No errors detected!'}
`;

  console.log(report);
  return report;
}

/**
 * 로컬 테스트 실행
 */
async function runLocalTest() {
  console.log('🚀 Starting CheerCast Local Performance Test...');
  console.log(`📊 Configuration: ${LOCAL_CONFIG.CONCURRENT_USERS} users × ${LOCAL_CONFIG.MESSAGES_PER_USER} messages`);
  console.log(`🖥️ Server: ${LOCAL_CONFIG.SERVER_URL}`);
  console.log(`💡 Chrome Extension을 켜고 ${LOCAL_CONFIG.SERVER_URL}에서 풍선을 확인하세요!`);
  
  localMetrics.startTime = Date.now();
  
  const metricsInterval = startLocalMetricsMonitoring();
  
  const browser = await chromium.launch({
    headless: false, // 브라우저 창을 보여줌 (Chrome Extension 확인용)
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const userPromises = [];
    
    for (let userId = 1; userId <= LOCAL_CONFIG.CONCURRENT_USERS; userId++) {
      if (userId > 1) {
        await new Promise(resolve => setTimeout(resolve, LOCAL_CONFIG.USER_SPAWN_INTERVAL_MS));
      }
      
      userPromises.push(simulateLocalUser(userId, browser));
    }
    
    console.log(`👥 ${LOCAL_CONFIG.CONCURRENT_USERS} local users spawned, waiting for completion...`);
    
    await Promise.allSettled(userPromises);
    
  } finally {
    localMetrics.endTime = Date.now();
    clearInterval(metricsInterval);
    
    console.log('🏁 All local users completed, keeping browser open for extension testing...');
    
    // 브라우저를 열어둬서 extension 테스트 가능
    console.log('💡 브라우저가 열려있습니다. Chrome Extension으로 풍선 확인 후 Ctrl+C로 종료하세요.');
    
    // 5초 후 자동 종료 (또는 사용자가 Ctrl+C)
    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 10000);
  }
  
  generateLocalReport();
}

if (require.main === module) {
  runLocalTest()
    .then(() => {
      console.log('✅ Local performance test completed!');
    })
    .catch(error => {
      console.error('❌ Local performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runLocalTest, LOCAL_CONFIG, localMetrics };