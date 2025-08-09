/**
 * CheerCast Quick Performance Test
 * 빠른 성능 테스트용 (10명 사용자 × 10개 메시지)
 */

const { chromium } = require('playwright');

// 빠른 테스트 설정
const QUICK_CONFIG = {
  CONCURRENT_USERS: 10,
  MESSAGES_PER_USER: 10,
  SERVER_URL: 'https://cheer-cast-production.up.railway.app',
  MESSAGE_INTERVAL_MS: 50,
  USER_SPAWN_INTERVAL_MS: 25,
  TEST_TIMEOUT_MS: 60000, // 1분
};

const quickMetrics = {
  startTime: null,
  endTime: null,
  totalMessagesSent: 0,
  successfulUsers: 0,
  failedUsers: 0,
  errors: [],
  responseTime: []
};

/**
 * 간단한 사용자 시뮬레이션
 */
async function simulateQuickUser(userId, browser) {
  let context = null;
  let page = null;
  
  try {
    context = await browser.newContext();
    page = await context.newPage();
    
    await page.goto(QUICK_CONFIG.SERVER_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('body');
    
    console.log(`👤 Quick User ${userId}: Sending ${QUICK_CONFIG.MESSAGES_PER_USER} messages`);
    
    for (let msgIndex = 0; msgIndex < QUICK_CONFIG.MESSAGES_PER_USER; msgIndex++) {
      try {
        const message = `Quick test ${msgIndex + 1} from User ${userId}`;
        const startTime = Date.now();
        
        const response = await page.evaluate(async (msg) => {
          const res = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
          });
          return res.ok;
        }, message);
        
        const responseTime = Date.now() - startTime;
        quickMetrics.responseTime.push(responseTime);
        
        if (response) {
          quickMetrics.totalMessagesSent++;
        }
        
        await page.waitForTimeout(QUICK_CONFIG.MESSAGE_INTERVAL_MS);
        
      } catch (error) {
        quickMetrics.errors.push(`User ${userId}: ${error.message}`);
      }
    }
    
    quickMetrics.successfulUsers++;
    console.log(`✅ Quick User ${userId}: Completed`);
    
  } catch (error) {
    quickMetrics.failedUsers++;
    quickMetrics.errors.push(`User ${userId}: ${error.message}`);
    console.error(`❌ Quick User ${userId}: Failed`);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
  }
}

/**
 * 빠른 테스트 실행
 */
async function runQuickTest() {
  console.log('🚀 Starting Quick Performance Test...');
  console.log(`📊 ${QUICK_CONFIG.CONCURRENT_USERS} users × ${QUICK_CONFIG.MESSAGES_PER_USER} messages`);
  
  quickMetrics.startTime = Date.now();
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    const userPromises = [];
    
    for (let userId = 1; userId <= QUICK_CONFIG.CONCURRENT_USERS; userId++) {
      if (userId > 1) {
        await new Promise(resolve => setTimeout(resolve, QUICK_CONFIG.USER_SPAWN_INTERVAL_MS));
      }
      userPromises.push(simulateQuickUser(userId, browser));
    }
    
    await Promise.allSettled(userPromises);
    
  } finally {
    quickMetrics.endTime = Date.now();
    await browser.close();
  }
  
  // 빠른 결과 리포트
  const duration = (quickMetrics.endTime - quickMetrics.startTime) / 1000;
  const messagesPerSecond = quickMetrics.totalMessagesSent / duration;
  const avgResponseTime = quickMetrics.responseTime.length > 0 
    ? quickMetrics.responseTime.reduce((a, b) => a + b, 0) / quickMetrics.responseTime.length 
    : 0;
  
  console.log(`
🎈 Quick Test Results:
- Duration: ${duration.toFixed(2)}s
- Messages Sent: ${quickMetrics.totalMessagesSent}/${QUICK_CONFIG.CONCURRENT_USERS * QUICK_CONFIG.MESSAGES_PER_USER}
- Messages/Second: ${messagesPerSecond.toFixed(2)}
- Success Rate: ${((quickMetrics.totalMessagesSent / (QUICK_CONFIG.CONCURRENT_USERS * QUICK_CONFIG.MESSAGES_PER_USER)) * 100).toFixed(1)}%
- Avg Response Time: ${avgResponseTime.toFixed(2)}ms
- Successful Users: ${quickMetrics.successfulUsers}/${QUICK_CONFIG.CONCURRENT_USERS}
- Errors: ${quickMetrics.errors.length}
  `);
  
  if (quickMetrics.errors.length > 0) {
    console.log('❌ Errors:', quickMetrics.errors.slice(0, 5));
  }
}

if (require.main === module) {
  runQuickTest()
    .then(() => {
      console.log('✅ Quick test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Quick test failed:', error);
      process.exit(1);
    });
}