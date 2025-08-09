/**
 * CheerCast Production Simple Test
 * 간단한 production 테스트 (10명 × 10개 메시지)
 */

const { chromium } = require('playwright');

const SIMPLE_PROD_CONFIG = {
  CONCURRENT_USERS: 10,
  MESSAGES_PER_USER: 10,
  SERVER_URL: 'https://cheer-cast-production.up.railway.app',
  MESSAGE_INTERVAL_MS: 200,
  USER_SPAWN_INTERVAL_MS: 500,
  TEST_TIMEOUT_MS: 120000,
};

const simpleMetrics = {
  startTime: null,
  endTime: null,
  totalMessagesSent: 0,
  successfulUsers: 0,
  failedUsers: 0,
  errors: [],
  responsetimes: [],
  serverErrors: 0
};

async function simpleUser(userId, browser) {
  let context = null;
  let page = null;
  
  try {
    console.log(`👤 Simple User ${userId}: Starting`);
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // 에러 모니터링
    page.on('pageerror', error => {
      console.log(`🐛 User ${userId} Page Error: ${error.message}`);
      simpleMetrics.errors.push(`User ${userId}: ${error.message}`);
    });
    
    page.on('requestfailed', request => {
      if (request.url().includes('/api/')) {
        console.log(`❌ User ${userId} Request Failed: ${request.url()}`);
        simpleMetrics.errors.push(`User ${userId}: Request failed ${request.url()}`);
      }
    });
    
    // Production 서버 접속
    console.log(`👤 User ${userId}: Connecting to production...`);
    await page.goto(SIMPLE_PROD_CONFIG.SERVER_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForSelector('body', { timeout: 10000 });
    console.log(`👤 User ${userId}: Connected successfully`);
    
    // 메시지 전송
    for (let msgIndex = 0; msgIndex < SIMPLE_PROD_CONFIG.MESSAGES_PER_USER; msgIndex++) {
      try {
        const message = `🎈 Simple prod test ${msgIndex + 1} from User ${userId}`;
        const startTime = Date.now();
        
        const response = await page.evaluate(async (msg) => {
          try {
            const response = await fetch('/api/send-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: msg })
            });
            
            const result = {
              ok: response.ok,
              status: response.status
            };
            
            if (response.ok) {
              result.data = await response.json();
            }
            
            return result;
          } catch (error) {
            return { ok: false, error: error.message };
          }
        }, message);
        
        const responseTime = Date.now() - startTime;
        simpleMetrics.responsetimes.push(responseTime);
        
        if (response.ok) {
          simpleMetrics.totalMessagesSent++;
          console.log(`✅ User ${userId}: Message ${msgIndex + 1} sent (${responseTime}ms)`);
        } else {
          simpleMetrics.serverErrors++;
          console.log(`❌ User ${userId}: Message ${msgIndex + 1} failed - ${response.status || response.error}`);
          simpleMetrics.errors.push(`User ${userId}: Message failed - ${response.status || response.error}`);
        }
        
        if (msgIndex < SIMPLE_PROD_CONFIG.MESSAGES_PER_USER - 1) {
          await page.waitForTimeout(SIMPLE_PROD_CONFIG.MESSAGE_INTERVAL_MS);
        }
        
      } catch (error) {
        console.log(`❌ User ${userId}: Message ${msgIndex + 1} error - ${error.message}`);
        simpleMetrics.errors.push(`User ${userId}: ${error.message}`);
      }
    }
    
    simpleMetrics.successfulUsers++;
    console.log(`✅ User ${userId}: Completed successfully!`);
    
  } catch (error) {
    simpleMetrics.failedUsers++;
    console.error(`❌ User ${userId}: Failed - ${error.message}`);
    simpleMetrics.errors.push(`User ${userId}: Critical - ${error.message}`);
  } finally {
    try {
      if (page) await page.close();
      if (context) await context.close();
    } catch (error) {
      console.error(`⚠️ User ${userId}: Cleanup error`);
    }
  }
}

function generateSimpleReport() {
  const duration = (simpleMetrics.endTime - simpleMetrics.startTime) / 1000;
  const messagesPerSecond = simpleMetrics.totalMessagesSent / duration;
  const avgResponseTime = simpleMetrics.responsetimes.length > 0 
    ? simpleMetrics.responsetimes.reduce((a, b) => a + b, 0) / simpleMetrics.responsetimes.length 
    : 0;
  
  const expectedTotal = SIMPLE_PROD_CONFIG.CONCURRENT_USERS * SIMPLE_PROD_CONFIG.MESSAGES_PER_USER;
  const successRate = (simpleMetrics.totalMessagesSent / expectedTotal * 100).toFixed(1);
  
  const report = `
🎈 Simple Production Test Results:
==================================
- Duration: ${duration.toFixed(2)}s
- Messages Sent: ${simpleMetrics.totalMessagesSent}/${expectedTotal}
- Success Rate: ${successRate}%
- Messages/Second: ${messagesPerSecond.toFixed(2)}
- Avg Response Time: ${avgResponseTime.toFixed(2)}ms
- Successful Users: ${simpleMetrics.successfulUsers}/${SIMPLE_PROD_CONFIG.CONCURRENT_USERS}
- Errors: ${simpleMetrics.errors.length}

${simpleMetrics.errors.length > 0 ? `\n❌ Errors:\n${simpleMetrics.errors.slice(0, 5).join('\n')}` : '✅ No errors!'}
`;
  
  console.log(report);
  return report;
}

async function runSimpleProductionTest() {
  console.log('🚀 Starting Simple Production Test...');
  console.log(`📊 ${SIMPLE_PROD_CONFIG.CONCURRENT_USERS} users × ${SIMPLE_PROD_CONFIG.MESSAGES_PER_USER} messages`);
  console.log(`🌐 Target: ${SIMPLE_PROD_CONFIG.SERVER_URL}`);
  
  simpleMetrics.startTime = Date.now();
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const userPromises = [];
    
    for (let userId = 1; userId <= SIMPLE_PROD_CONFIG.CONCURRENT_USERS; userId++) {
      if (userId > 1) {
        await new Promise(resolve => setTimeout(resolve, SIMPLE_PROD_CONFIG.USER_SPAWN_INTERVAL_MS));
      }
      userPromises.push(simpleUser(userId, browser));
    }
    
    console.log(`👥 ${SIMPLE_PROD_CONFIG.CONCURRENT_USERS} users active...`);
    await Promise.allSettled(userPromises);
    
  } finally {
    simpleMetrics.endTime = Date.now();
    await browser.close();
  }
  
  generateSimpleReport();
}

if (require.main === module) {
  runSimpleProductionTest()
    .then(() => {
      console.log('✅ Simple production test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Simple production test failed:', error);
      process.exit(1);
    });
}

module.exports = { runSimpleProductionTest };