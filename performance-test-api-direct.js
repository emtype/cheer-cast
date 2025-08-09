/**
 * CheerCast API Direct Test
 * 웹페이지 로드 없이 API 엔드포인트만 직접 테스트
 */

const { chromium } = require('playwright');

const API_CONFIG = {
  CONCURRENT_USERS: 20,
  MESSAGES_PER_USER: 20,
  API_BASE_URL: 'https://cheer-cast-production.up.railway.app',
  MESSAGE_INTERVAL_MS: 100,
  USER_SPAWN_INTERVAL_MS: 100,
  TEST_TIMEOUT_MS: 180000, // 3분
};

const apiMetrics = {
  startTime: null,
  endTime: null,
  totalMessagesSent: 0,
  successfulUsers: 0,
  failedUsers: 0,
  errors: [],
  responsetimes: [],
  serverErrors: 0,
  rateLimits: 0
};

/**
 * API 직접 호출 사용자 시뮬레이션
 */
async function simulateApiUser(userId, browser) {
  let context = null;
  let page = null;
  
  try {
    console.log(`🌐 API User ${userId}: Starting direct API test`);
    
    context = await browser.newContext({
      extraHTTPHeaders: {
        'User-Agent': `CheerCast-API-Test-User-${userId}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    page = await context.newPage();
    
    // 1. 먼저 빈 페이지를 로드 (API 호출용)
    await page.goto('about:blank');
    
    // 2. 세션 등록 API 호출
    console.log(`🌐 API User ${userId}: Registering session...`);
    const sessionId = `api-test-user-${userId}-${Date.now()}`;
    
    try {
      const joinResponse = await page.evaluate(async (baseUrl, sessionId) => {
        const response = await fetch(`${baseUrl}/api/user-join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json()
        };
      }, API_CONFIG.API_BASE_URL, sessionId);
      
      if (joinResponse.ok) {
        console.log(`✅ API User ${userId}: Session registered successfully`);
      } else {
        console.log(`⚠️ API User ${userId}: Session registration failed: ${joinResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ API User ${userId}: Session registration error: ${error.message}`);
    }
    
    // 3. 메시지 전송 테스트
    console.log(`🌐 API User ${userId}: Sending ${API_CONFIG.MESSAGES_PER_USER} messages via API...`);
    
    for (let msgIndex = 0; msgIndex < API_CONFIG.MESSAGES_PER_USER; msgIndex++) {
      try {
        const message = `🌐 API Direct test ${msgIndex + 1}/${API_CONFIG.MESSAGES_PER_USER} from User ${userId} at ${new Date().toLocaleTimeString()}`;
        const startTime = Date.now();
        
        const response = await page.evaluate(async (baseUrl, msg) => {
          try {
            const response = await fetch(`${baseUrl}/api/send-message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg })
            });
            
            return {
              ok: response.ok,
              status: response.status,
              data: response.ok ? await response.json() : null,
              error: null
            };
          } catch (error) {
            return {
              ok: false,
              status: 0,
              data: null,
              error: error.message
            };
          }
        }, API_CONFIG.API_BASE_URL, message);
        
        const responseTime = Date.now() - startTime;
        apiMetrics.responsetimes.push(responseTime);
        
        if (response.ok) {
          apiMetrics.totalMessagesSent++;
          console.log(`✅ API User ${userId}: Message ${msgIndex + 1} sent (${responseTime}ms)`);
        } else {
          if (response.status === 429) {
            apiMetrics.rateLimits++;
            console.log(`⚠️ API User ${userId}: Rate limited (${responseTime}ms)`);
            // Rate limit 시 더 긴 대기
            await page.waitForTimeout(1000);
          } else {
            apiMetrics.serverErrors++;
            console.log(`❌ API User ${userId}: Message ${msgIndex + 1} failed - ${response.status} (${responseTime}ms)`);
          }
          apiMetrics.errors.push(`User ${userId}: Message ${msgIndex + 1} - ${response.status || response.error}`);
        }
        
        // 메시지 간 간격
        if (msgIndex < API_CONFIG.MESSAGES_PER_USER - 1) {
          await page.waitForTimeout(API_CONFIG.MESSAGE_INTERVAL_MS);
        }
        
      } catch (error) {
        apiMetrics.errors.push(`User ${userId}: Message ${msgIndex + 1} - ${error.message}`);
        console.log(`❌ API User ${userId}: Message ${msgIndex + 1} error - ${error.message}`);
      }
    }
    
    // 4. 세션 해제
    try {
      await page.evaluate(async (baseUrl, sessionId) => {
        await fetch(`${baseUrl}/api/user-leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
      }, API_CONFIG.API_BASE_URL, sessionId);
    } catch (error) {
      console.log(`⚠️ API User ${userId}: Session cleanup error`);
    }
    
    apiMetrics.successfulUsers++;
    console.log(`✅ API User ${userId}: Completed successfully!`);
    
  } catch (error) {
    apiMetrics.failedUsers++;
    apiMetrics.errors.push(`User ${userId}: Critical - ${error.message}`);
    console.error(`❌ API User ${userId}: Failed - ${error.message}`);
  } finally {
    try {
      if (page) await page.close();
      if (context) await context.close();
    } catch (error) {
      console.error(`⚠️ API User ${userId}: Cleanup error`);
    }
  }
}

function startApiMetricsMonitoring() {
  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - apiMetrics.startTime) / 1000;
    
    const messagesPerSecond = elapsed > 0 ? (apiMetrics.totalMessagesSent / elapsed).toFixed(2) : 0;
    const avgResponseTime = apiMetrics.responsetimes.length > 0 
      ? apiMetrics.responsetimes.reduce((a, b) => a + b, 0) / apiMetrics.responsetimes.length 
      : 0;
    const progress = ((apiMetrics.successfulUsers + apiMetrics.failedUsers) / API_CONFIG.CONCURRENT_USERS * 100).toFixed(1);
    
    console.log(`📊 [${elapsed.toFixed(0)}s] Progress: ${progress}% | Messages: ${apiMetrics.totalMessagesSent} | Rate: ${messagesPerSecond}/s | Avg: ${avgResponseTime.toFixed(0)}ms | 429s: ${apiMetrics.rateLimits} | Errors: ${apiMetrics.errors.length}`);
    
    if (apiMetrics.endTime) {
      clearInterval(interval);
    }
  }, 2000);
  
  return interval;
}

function generateApiReport() {
  const duration = (apiMetrics.endTime - apiMetrics.startTime) / 1000;
  const messagesPerSecond = apiMetrics.totalMessagesSent / duration;
  const avgResponseTime = apiMetrics.responsetimes.length > 0 
    ? apiMetrics.responsetimes.reduce((a, b) => a + b, 0) / apiMetrics.responsetimes.length 
    : 0;
  
  const expectedTotal = API_CONFIG.CONCURRENT_USERS * API_CONFIG.MESSAGES_PER_USER;
  const successRate = (apiMetrics.totalMessagesSent / expectedTotal * 100).toFixed(1);
  
  const report = `
🌐 CheerCast API Direct Test Results
====================================

📊 Test Configuration:
- Concurrent Users: ${API_CONFIG.CONCURRENT_USERS}
- Messages per User: ${API_CONFIG.MESSAGES_PER_USER}
- API Base URL: ${API_CONFIG.API_BASE_URL}
- Total Expected Messages: ${expectedTotal}

⏱️ Performance Results:
- Test Duration: ${duration.toFixed(2)}s
- Messages Sent: ${apiMetrics.totalMessagesSent}/${expectedTotal}
- Messages/Second: ${messagesPerSecond.toFixed(2)}
- Success Rate: ${successRate}%

👥 User Statistics:
- Successful Users: ${apiMetrics.successfulUsers}/${API_CONFIG.CONCURRENT_USERS}
- Failed Users: ${apiMetrics.failedUsers}

🚀 Response Time Analysis:
- Average: ${avgResponseTime.toFixed(2)}ms
- Min: ${apiMetrics.responsetimes.length > 0 ? Math.min(...apiMetrics.responsetimes) : 0}ms
- Max: ${apiMetrics.responsetimes.length > 0 ? Math.max(...apiMetrics.responsetimes) : 0}ms

❌ Error Analysis:
- Total Errors: ${apiMetrics.errors.length}
- Rate Limits (429): ${apiMetrics.rateLimits}
- Server Errors: ${apiMetrics.serverErrors}

🎯 API Performance Grade: ${getApiGrade(messagesPerSecond, avgResponseTime, successRate)}

${apiMetrics.errors.length > 0 ? `\n⚠️ Recent Errors:\n${apiMetrics.errors.slice(-10).join('\n')}` : '✅ No errors detected!'}
`;

  console.log(report);
  return report;
}

function getApiGrade(messagesPerSecond, avgResponseTime, successRate) {
  if (successRate < 90) return '❌ POOR - Low success rate';
  if (messagesPerSecond > 50 && avgResponseTime < 300 && successRate > 95) return '🏆 EXCELLENT';
  if (messagesPerSecond > 30 && avgResponseTime < 500 && successRate > 90) return '🎯 GOOD';
  if (messagesPerSecond > 15 && avgResponseTime < 800 && successRate > 85) return '⚠️ FAIR';
  return '❌ POOR';
}

async function runApiDirectTest() {
  console.log('🌐 Starting CheerCast API Direct Test...');
  console.log(`📊 Configuration: ${API_CONFIG.CONCURRENT_USERS} users × ${API_CONFIG.MESSAGES_PER_USER} messages`);
  console.log(`🎯 Target API: ${API_CONFIG.API_BASE_URL}/api/*`);
  console.log('💡 이 테스트는 웹페이지 로드 없이 API만 직접 호출합니다.');
  
  apiMetrics.startTime = Date.now();
  
  const metricsInterval = startApiMetricsMonitoring();
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const userPromises = [];
    
    for (let userId = 1; userId <= API_CONFIG.CONCURRENT_USERS; userId++) {
      if (userId > 1) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.USER_SPAWN_INTERVAL_MS));
      }
      userPromises.push(simulateApiUser(userId, browser));
    }
    
    console.log(`👥 ${API_CONFIG.CONCURRENT_USERS} API users spawned...`);
    await Promise.allSettled(userPromises);
    
  } finally {
    apiMetrics.endTime = Date.now();
    clearInterval(metricsInterval);
    await browser.close();
  }
  
  generateApiReport();
}

if (require.main === module) {
  runApiDirectTest()
    .then(() => {
      console.log('✅ API direct test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ API direct test failed:', error);
      process.exit(1);
    });
}

module.exports = { runApiDirectTest };