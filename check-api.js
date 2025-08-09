/**
 * CheerCast API 상태 확인
 */

const { chromium } = require('playwright');

async function checkApiStatus() {
  console.log('🔍 CheerCast API 상태 확인 중...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 빈 페이지 로드 (API 호출용)
    await page.goto('about:blank');
    
    const baseUrl = 'https://cheer-cast-production.up.railway.app';
    
    console.log(`🌐 API Base URL: ${baseUrl}`);
    console.log('');
    
    // 1. Settings API 확인
    console.log('📋 1. Settings API 테스트...');
    try {
      const settingsResult = await page.evaluate(async (url) => {
        const start = Date.now();
        const response = await fetch(`${url}/api/settings`);
        const responseTime = Date.now() - start;
        return {
          ok: response.ok,
          status: response.status,
          responseTime,
          data: response.ok ? await response.json() : null
        };
      }, baseUrl);
      
      if (settingsResult.ok) {
        console.log(`✅ Settings API: ${settingsResult.status} (${settingsResult.responseTime}ms)`);
        console.log(`   Title: "${settingsResult.data?.settings?.title}"`);
      } else {
        console.log(`❌ Settings API: ${settingsResult.status} (${settingsResult.responseTime}ms)`);
      }
    } catch (error) {
      console.log(`❌ Settings API: ${error.message}`);
    }
    
    console.log('');
    
    // 2. User Join API 확인
    console.log('👤 2. User Join API 테스트...');
    try {
      const joinResult = await page.evaluate(async (url) => {
        const start = Date.now();
        const response = await fetch(`${url}/api/user-join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'api-check-session' })
        });
        const responseTime = Date.now() - start;
        return {
          ok: response.ok,
          status: response.status,
          responseTime,
          data: response.ok ? await response.json() : null
        };
      }, baseUrl);
      
      if (joinResult.ok) {
        console.log(`✅ User Join API: ${joinResult.status} (${joinResult.responseTime}ms)`);
        console.log(`   Current Users: ${joinResult.data?.userStats?.currentUsers}`);
      } else {
        console.log(`❌ User Join API: ${joinResult.status} (${joinResult.responseTime}ms)`);
      }
    } catch (error) {
      console.log(`❌ User Join API: ${error.message}`);
    }
    
    console.log('');
    
    // 3. Send Message API 확인
    console.log('💬 3. Send Message API 테스트...');
    try {
      const messageResult = await page.evaluate(async (url) => {
        const start = Date.now();
        const response = await fetch(`${url}/api/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '🔍 API 상태 확인 메시지' })
        });
        const responseTime = Date.now() - start;
        return {
          ok: response.ok,
          status: response.status,
          responseTime,
          data: response.ok ? await response.json() : null
        };
      }, baseUrl);
      
      if (messageResult.ok) {
        console.log(`✅ Send Message API: ${messageResult.status} (${messageResult.responseTime}ms)`);
        console.log(`   Message: "${messageResult.data?.message}"`);
      } else {
        console.log(`❌ Send Message API: ${messageResult.status} (${messageResult.responseTime}ms)`);
      }
    } catch (error) {
      console.log(`❌ Send Message API: ${error.message}`);
    }
    
    console.log('');
    
    // 4. User Stats API 확인
    console.log('📊 4. User Stats API 테스트...');
    try {
      const statsResult = await page.evaluate(async (url) => {
        const start = Date.now();
        const response = await fetch(`${url}/api/user-stats`);
        const responseTime = Date.now() - start;
        return {
          ok: response.ok,
          status: response.status,
          responseTime,
          data: response.ok ? await response.json() : null
        };
      }, baseUrl);
      
      if (statsResult.ok) {
        console.log(`✅ User Stats API: ${statsResult.status} (${statsResult.responseTime}ms)`);
        console.log(`   Current Users: ${statsResult.data?.userStats?.currentUsers}`);
        console.log(`   Total Visits: ${statsResult.data?.userStats?.totalVisits}`);
      } else {
        console.log(`❌ User Stats API: ${statsResult.status} (${statsResult.responseTime}ms)`);
      }
    } catch (error) {
      console.log(`❌ User Stats API: ${error.message}`);
    }
    
    console.log('');
    
    // 5. User Leave API 확인
    console.log('👋 5. User Leave API 테스트...');
    try {
      const leaveResult = await page.evaluate(async (url) => {
        const start = Date.now();
        const response = await fetch(`${url}/api/user-leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'api-check-session' })
        });
        const responseTime = Date.now() - start;
        return {
          ok: response.ok,
          status: response.status,
          responseTime,
          data: response.ok ? await response.json() : null
        };
      }, baseUrl);
      
      if (leaveResult.ok) {
        console.log(`✅ User Leave API: ${leaveResult.status} (${leaveResult.responseTime}ms)`);
      } else {
        console.log(`❌ User Leave API: ${leaveResult.status} (${leaveResult.responseTime}ms)`);
      }
    } catch (error) {
      console.log(`❌ User Leave API: ${error.message}`);
    }
    
    console.log('');
    console.log('🎯 API 상태 확인 완료!');
    console.log('💡 모든 API가 정상이면 performance test를 실행할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ API 상태 확인 실패:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  checkApiStatus()
    .then(() => {
      console.log('✅ API 상태 확인 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ API 상태 확인 실패:', error);
      process.exit(1);
    });
}