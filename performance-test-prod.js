/**
 * CheerCast Production Performance Test
 * Production 서버 대상 대규모 성능 테스트: 100명 × 100개 메시지
 */

const { chromium } = require('playwright');

// Production 대규모 테스트 설정
const PROD_CONFIG = {
  CONCURRENT_USERS: 100,
  MESSAGES_PER_USER: 100,
  SERVER_URL: 'https://cheer-cast-production.up.railway.app',
  MESSAGE_INTERVAL_MS: 50, // 빠른 전송을 위해 50ms로 단축
  USER_SPAWN_INTERVAL_MS: 25, // 빠른 사용자 생성
  TEST_TIMEOUT_MS: 600000, // 10분 타임아웃
  METRICS_INTERVAL_MS: 2000, // 2초마다 메트릭 수집
};

const prodMetrics = {
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
  performanceData: [],
  rateLimit429: 0,
  connectionErrors: 0,
  timeouts: 0
};

/**
 * Production 사용자 시뮬레이션
 */
async function simulateProdUser(userId, browser) {
  let context = null;
  let page = null;
  let userMessagesSent = 0;
  
  try {
    console.log(`🌟 Prod User ${userId}: Starting simulation`);
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: `CheerCast-ProdTestUser-${userId}`,
      extraHTTPHeaders: {
        'X-Test-User': `prod-user-${userId}`,
        'Accept': 'application/json'
      }
    });
    
    page = await context.newPage();
    
    // 고급 네트워크 모니터링
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        const responseTime = Date.now() - (response.request().timing?.startTime || Date.now());
        prodMetrics.responsetimes.push(responseTime);
        
        if (response.status() === 429) {
          prodMetrics.rateLimit429++;
          prodMetrics.errors.push(`User ${userId}: Rate limited (429)`);
        } else if (response.status() >= 400) {
          prodMetrics.serverErrors++;
          prodMetrics.errors.push(`User ${userId}: Server error ${response.status()}`);
        }
      }
    });
    
    page.on('requestfailed', request => {
      if (request.url().includes('/api/')) {
        prodMetrics.connectionErrors++;
        prodMetrics.errors.push(`User ${userId}: Connection failed - ${request.failure()?.errorText}`);
      }
    });
    
    page.on('pageerror', error => {
      prodMetrics.errors.push(`User ${userId}: Page error - ${error.message}`);
    });
    
    // Production 서버로 이동
    console.log(`🌟 Prod User ${userId}: Connecting to production server`);
    await page.goto(PROD_CONFIG.SERVER_URL, { 
      waitUntil: 'networkidle',
      timeout: 45000 
    });
    
    await page.waitForSelector('body', { timeout: 15000 });
    
    // 세션 등록
    const sessionId = `prod-test-user-${userId}-${Date.now()}`;
    await registerProdUserSession(page, sessionId);
    
    console.log(`🌟 Prod User ${userId}: Starting to send ${PROD_CONFIG.MESSAGES_PER_USER} messages`);
    
    // 메시지 연속 전송 (Production 대량 테스트)
    for (let msgIndex = 0; msgIndex < PROD_CONFIG.MESSAGES_PER_USER; msgIndex++) {
      try {
        const message = `🚀 Production test ${msgIndex + 1}/100 from User ${userId} | Batch: ${Math.floor(msgIndex/10)+1} | ${new Date().toLocaleTimeString()}`;
        const startTime = Date.now();
        
        // 타임아웃과 함께 메시지 전송
        const response = await Promise.race([
          page.evaluate(async (msg) => {
            const response = await fetch('/api/send-message', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'X-Test-Source': 'playwright-prod-test'
              },
              body: JSON.stringify({ message: msg })
            });
            return {
              ok: response.ok,
              status: response.status,
              data: await response.json()
            };
          }, message),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]);
        
        const responseTime = Date.now() - startTime;
        prodMetrics.responsetimes.push(responseTime);
        
        if (response.ok) {
          prodMetrics.totalMessagesSent++;
          userMessagesSent++;
          
          if (msgIndex % 10 === 9) { // 10개마다 로그
            console.log(`✅ Prod User ${userId}: Batch ${Math.floor(msgIndex/10)+1} completed (${userMessagesSent}/100) - Avg: ${responseTime}ms`);
          }
        } else {
          if (response.status === 429) {
            prodMetrics.rateLimit429++;
            // Rate limit 시 약간 더 대기
            await page.waitForTimeout(1000);
          } else {
            prodMetrics.serverErrors++;
          }
          prodMetrics.errors.push(`User ${userId}: Message ${msgIndex + 1} failed - ${response.status}`);
        }
        
        // 메시지 간 간격 (adaptive)
        const nextDelay = response?.status === 429 ? 200 : PROD_CONFIG.MESSAGE_INTERVAL_MS;
        if (msgIndex < PROD_CONFIG.MESSAGES_PER_USER - 1) {
          await page.waitForTimeout(nextDelay);
        }
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          prodMetrics.timeouts++;
        } else {
          prodMetrics.networkErrors++;
        }
        prodMetrics.errors.push(`User ${userId}: Error on message ${msgIndex + 1} - ${error.message}`);
        
        // 에러 시 잠시 대기
        await page.waitForTimeout(500);
      }
    }
    
    // 완료 대기
    await page.waitForTimeout(3000);
    
    // 세션 종료
    await unregisterProdUserSession(page, sessionId);
    
    prodMetrics.successfulUsers++;
    console.log(`✅ Prod User ${userId}: Completed successfully! Sent: ${userMessagesSent}/100 messages`);
    
  } catch (error) {
    prodMetrics.failedUsers++;
    prodMetrics.errors.push(`User ${userId}: Critical error - ${error.message}`);
    console.error(`❌ Prod User ${userId}: Failed -`, error.message);
  } finally {
    try {
      if (page) await page.close();
      if (context) await context.close();
    } catch (error) {
      console.error(`⚠️ Prod User ${userId}: Cleanup error -`, error.message);
    }
  }
}

async function registerProdUserSession(page, sessionId) {
  try {
    await page.evaluate(async (sessionId) => {
      await fetch('/api/user-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    }, sessionId);
  } catch (error) {
    console.error('Prod session registration failed:', error.message);
  }
}

async function unregisterProdUserSession(page, sessionId) {
  try {
    await page.evaluate(async (sessionId) => {
      await fetch('/api/user-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    }, sessionId);
  } catch (error) {
    console.error('Prod session unregistration failed:', error.message);
  }
}

function startProdMetricsMonitoring() {
  const interval = setInterval(() => {
    const now = Date.now();
    const elapsed = (now - prodMetrics.startTime) / 1000;
    
    const snapshot = {
      timestamp: now,
      elapsed: elapsed,
      messagesSent: prodMetrics.totalMessagesSent,
      activeUsers: prodMetrics.successfulUsers + prodMetrics.failedUsers,
      completionRate: ((prodMetrics.successfulUsers + prodMetrics.failedUsers) / PROD_CONFIG.CONCURRENT_USERS * 100).toFixed(1),
      errors: prodMetrics.errors.length,
      avgResponseTime: prodMetrics.responsetimes.length > 0 
        ? prodMetrics.responsetimes.reduce((a, b) => a + b, 0) / prodMetrics.responsetimes.length 
        : 0,
      rateLimits: prodMetrics.rateLimit429,
      messagesPerSecond: elapsed > 0 ? (prodMetrics.totalMessagesSent / elapsed).toFixed(2) : 0
    };
    
    prodMetrics.performanceData.push(snapshot);
    
    console.log(`📊 [${elapsed.toFixed(0)}s] Progress: ${snapshot.completionRate}% | Messages: ${snapshot.messagesSent}/10000 | Rate: ${snapshot.messagesPerSecond}/s | Avg Response: ${snapshot.avgResponseTime.toFixed(0)}ms | 429s: ${snapshot.rateLimits} | Errors: ${snapshot.errors}`);
    
    if (prodMetrics.endTime) {
      clearInterval(interval);
    }
  }, PROD_CONFIG.METRICS_INTERVAL_MS);
  
  return interval;
}

function generateProdReport() {
  const duration = (prodMetrics.endTime - prodMetrics.startTime) / 1000;
  const messagesPerSecond = prodMetrics.totalMessagesSent / duration;
  const avgResponseTime = prodMetrics.responsetimes.length > 0 
    ? prodMetrics.responsetimes.reduce((a, b) => a + b, 0) / prodMetrics.responsetimes.length 
    : 0;
  const maxResponseTime = prodMetrics.responsetimes.length > 0 ? Math.max(...prodMetrics.responsetimes) : 0;
  const minResponseTime = prodMetrics.responsetimes.length > 0 ? Math.min(...prodMetrics.responsetimes) : 0;
  const p95ResponseTime = prodMetrics.responsetimes.length > 0 
    ? prodMetrics.responsetimes.sort((a, b) => a - b)[Math.floor(prodMetrics.responsetimes.length * 0.95)] 
    : 0;
  
  const expectedTotal = PROD_CONFIG.CONCURRENT_USERS * PROD_CONFIG.MESSAGES_PER_USER;
  const successRate = (prodMetrics.totalMessagesSent / expectedTotal * 100).toFixed(1);
  const userSuccessRate = (prodMetrics.successfulUsers / PROD_CONFIG.CONCURRENT_USERS * 100).toFixed(1);
  
  const performanceGrade = getProductionGrade(messagesPerSecond, avgResponseTime, prodMetrics.errors.length, successRate);
  
  const report = `
🚀 CheerCast Production Performance Test Report
===============================================

📊 Test Configuration:
- Concurrent Users: ${PROD_CONFIG.CONCURRENT_USERS}
- Messages per User: ${PROD_CONFIG.MESSAGES_PER_USER}
- Server: ${PROD_CONFIG.SERVER_URL}
- Total Expected Messages: ${expectedTotal}

⏱️ Performance Results:
- Test Duration: ${duration.toFixed(2)}s (${(duration/60).toFixed(1)} minutes)
- Messages Sent: ${prodMetrics.totalMessagesSent}/${expectedTotal}
- Messages/Second: ${messagesPerSecond.toFixed(2)}
- Overall Success Rate: ${successRate}%

👥 User Statistics:
- Successful Users: ${prodMetrics.successfulUsers}/${PROD_CONFIG.CONCURRENT_USERS}
- Failed Users: ${prodMetrics.failedUsers}
- User Success Rate: ${userSuccessRate}%

🚀 Response Time Analysis:
- Average: ${avgResponseTime.toFixed(2)}ms
- P95: ${p95ResponseTime}ms
- Min: ${minResponseTime}ms
- Max: ${maxResponseTime}ms

❌ Error Breakdown:
- Total Errors: ${prodMetrics.errors.length}
- Rate Limits (429): ${prodMetrics.rateLimit429}
- Server Errors (4xx/5xx): ${prodMetrics.serverErrors}
- Network/Connection: ${prodMetrics.networkErrors}
- Timeouts: ${prodMetrics.timeouts}

🎯 Production Performance Grade: ${performanceGrade}

📈 Throughput Analysis:
- Peak Messages/Second: ${Math.max(...prodMetrics.performanceData.map(d => parseFloat(d.messagesPerSecond) || 0)).toFixed(2)}
- Total Data Processed: ~${(prodMetrics.totalMessagesSent * 50 / 1024).toFixed(1)} KB
- Server Stability: ${prodMetrics.rateLimit429 < 100 ? '🟢 Excellent' : prodMetrics.rateLimit429 < 500 ? '🟡 Good' : '🔴 Needs Optimization'}

${prodMetrics.errors.length > 0 ? `\n⚠️ Recent Errors (last 10):\n${prodMetrics.errors.slice(-10).join('\n')}` : '✅ No errors detected! Perfect run!'}

💡 Recommendations:
${generateProdRecommendations(messagesPerSecond, avgResponseTime, prodMetrics.rateLimit429)}
`;

  console.log(report);
  return report;
}

function getProductionGrade(messagesPerSecond, avgResponseTime, errorCount, successRate) {
  if (errorCount > 500 || successRate < 90) return '❌ FAIL - Too many errors or low success rate';
  if (messagesPerSecond > 100 && avgResponseTime < 300 && successRate > 98) return '🏆 EXCELLENT - Production Ready!';
  if (messagesPerSecond > 70 && avgResponseTime < 500 && successRate > 95) return '🎯 VERY GOOD - Strong Performance';
  if (messagesPerSecond > 50 && avgResponseTime < 800 && successRate > 90) return '✅ GOOD - Acceptable Performance';
  if (messagesPerSecond > 30 && avgResponseTime < 1500 && successRate > 85) return '⚠️ FAIR - Needs Optimization';
  return '❌ POOR - Significant Issues';
}

function generateProdRecommendations(messagesPerSecond, avgResponseTime, rateLimits) {
  const recommendations = [];
  
  if (messagesPerSecond < 50) {
    recommendations.push('- 🔧 Consider server scaling or optimization');
  }
  if (avgResponseTime > 500) {
    recommendations.push('- ⚡ Optimize API response times');
  }
  if (rateLimits > 200) {
    recommendations.push('- 📈 Increase rate limiting thresholds');
  }
  if (prodMetrics.serverErrors > 50) {
    recommendations.push('- 🛠️ Investigate server stability issues');
  }
  if (prodMetrics.networkErrors > 100) {
    recommendations.push('- 🌐 Check network connectivity and timeouts');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('- 🎉 Excellent performance! No optimizations needed.');
  }
  
  return recommendations.join('\n');
}

/**
 * Production 대규모 테스트 실행
 */
async function runProductionTest() {
  console.log('🚀 Starting CheerCast Production Performance Test...');
  console.log('⚠️  WARNING: This will send 10,000 messages to production server!');
  console.log(`📊 Configuration: ${PROD_CONFIG.CONCURRENT_USERS} users × ${PROD_CONFIG.MESSAGES_PER_USER} messages`);
  console.log(`🌐 Target: ${PROD_CONFIG.SERVER_URL}`);
  console.log('📈 Expected duration: 5-10 minutes');
  console.log('');
  
  // 사용자 확인 (Production이므로)
  console.log('⏰ Starting in 5 seconds... Press Ctrl+C to cancel');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  prodMetrics.startTime = Date.now();
  
  const metricsInterval = startProdMetricsMonitoring();
  
  const browser = await chromium.launch({
    headless: true, // Production 테스트는 헤드리스
    args: [
      '--no-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-features=VizDisplayCompositor' // 메모리 최적화
    ]
  });
  
  try {
    const userPromises = [];
    
    console.log(`👥 Spawning ${PROD_CONFIG.CONCURRENT_USERS} production users...`);
    
    // 사용자들을 빠르게 생성
    for (let userId = 1; userId <= PROD_CONFIG.CONCURRENT_USERS; userId++) {
      if (userId > 1) {
        await new Promise(resolve => setTimeout(resolve, PROD_CONFIG.USER_SPAWN_INTERVAL_MS));
      }
      
      userPromises.push(simulateProdUser(userId, browser));
      
      // 20명씩 그룹으로 로그
      if (userId % 20 === 0) {
        console.log(`📦 Batch ${userId/20}: ${userId} users spawned`);
      }
    }
    
    console.log(`🎯 All ${PROD_CONFIG.CONCURRENT_USERS} users active! Running production load test...`);
    console.log('📊 Real-time monitoring every 2 seconds:');
    
    await Promise.allSettled(userPromises);
    
  } finally {
    prodMetrics.endTime = Date.now();
    clearInterval(metricsInterval);
    
    console.log('🏁 Production test completed, closing browser...');
    await browser.close();
  }
  
  generateProdReport();
}

if (require.main === module) {
  runProductionTest()
    .then(() => {
      console.log('✅ Production performance test completed successfully!');
      console.log('🎈 Check your browser extensions to see the balloons!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Production performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runProductionTest, PROD_CONFIG, prodMetrics };