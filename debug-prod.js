/**
 * Production 서버 연결 디버그 테스트
 */

const { chromium } = require('playwright');

async function debugProductionConnection() {
  console.log('🔍 Production 서버 연결 디버그 테스트 시작...');
  
  const browser = await chromium.launch({ 
    headless: false, // 브라우저 창 보기
    args: ['--no-sandbox'] 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 네트워크 이벤트 모니터링
    page.on('response', response => {
      console.log(`📡 Response: ${response.status()} ${response.url()}`);
    });
    
    page.on('requestfailed', request => {
      console.log(`❌ Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    page.on('console', msg => {
      console.log(`🖥️ Browser Console: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log(`🐛 Page Error: ${error.message}`);
    });
    
    console.log('🌐 Production 서버 접속 중...');
    
    // Production 서버 접속
    const response = await page.goto('https://cheer-cast-production.up.railway.app', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log(`✅ 페이지 로드 완료: ${response.status()}`);
    
    // 페이지 내용 확인
    const title = await page.title();
    console.log(`📄 페이지 제목: ${title}`);
    
    // body 요소 확인
    const hasBody = await page.locator('body').count();
    console.log(`🏗️ Body 요소 존재: ${hasBody > 0 ? 'Yes' : 'No'}`);
    
    // API 엔드포인트 테스트
    console.log('\n🧪 API 테스트 시작...');
    
    // 1. 설정 조회 테스트
    try {
      const settingsResponse = await page.evaluate(async () => {
        const response = await fetch('/api/settings');
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json()
        };
      });
      console.log(`✅ Settings API: ${settingsResponse.status} - ${JSON.stringify(settingsResponse.data)}`);
    } catch (error) {
      console.log(`❌ Settings API 실패: ${error.message}`);
    }
    
    // 2. 세션 등록 테스트
    try {
      const sessionResponse = await page.evaluate(async () => {
        const response = await fetch('/api/user-join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'debug-test-session' })
        });
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json()
        };
      });
      console.log(`✅ User Join API: ${sessionResponse.status} - ${JSON.stringify(sessionResponse.data)}`);
    } catch (error) {
      console.log(`❌ User Join API 실패: ${error.message}`);
    }
    
    // 3. 메시지 전송 테스트
    try {
      const messageResponse = await page.evaluate(async () => {
        const response = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '🔍 Debug test message from debug script' })
        });
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json()
        };
      });
      console.log(`✅ Send Message API: ${messageResponse.status} - ${JSON.stringify(messageResponse.data)}`);
    } catch (error) {
      console.log(`❌ Send Message API 실패: ${error.message}`);
    }
    
    // 4. SSE 연결 테스트
    console.log('\n📡 SSE 연결 테스트...');
    try {
      const sseTest = await page.evaluate(() => {
        return new Promise((resolve) => {
          const eventSource = new EventSource('/api/balloon-stream');
          
          const timeout = setTimeout(() => {
            eventSource.close();
            resolve({ status: 'timeout', message: 'SSE connection timeout' });
          }, 5000);
          
          eventSource.onopen = () => {
            clearTimeout(timeout);
            eventSource.close();
            resolve({ status: 'success', message: 'SSE connection successful' });
          };
          
          eventSource.onerror = (error) => {
            clearTimeout(timeout);
            eventSource.close();
            resolve({ status: 'error', message: 'SSE connection failed' });
          };
        });
      });
      console.log(`📡 SSE Test: ${sseTest.status} - ${sseTest.message}`);
    } catch (error) {
      console.log(`❌ SSE Test 실패: ${error.message}`);
    }
    
    // 5. 연속 메시지 테스트 (5개)
    console.log('\n🔄 연속 메시지 테스트 (5개)...');
    for (let i = 1; i <= 5; i++) {
      try {
        const start = Date.now();
        const response = await page.evaluate(async (msgNum) => {
          const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: `🔄 Debug batch message ${msgNum}/5` })
          });
          return {
            ok: response.ok,
            status: response.status
          };
        }, i);
        const responseTime = Date.now() - start;
        
        if (response.ok) {
          console.log(`✅ Message ${i}/5: ${response.status} (${responseTime}ms)`);
        } else {
          console.log(`❌ Message ${i}/5: ${response.status} (${responseTime}ms)`);
        }
        
        // 메시지 간 간격
        await page.waitForTimeout(200);
      } catch (error) {
        console.log(`❌ Message ${i}/5 실패: ${error.message}`);
      }
    }
    
    console.log('\n✅ 디버그 테스트 완료!');
    console.log('📊 브라우저를 10초간 열어둡니다...');
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ 디버그 테스트 실패:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  debugProductionConnection()
    .then(() => {
      console.log('🏁 디버그 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 디버그 실패:', error);
      process.exit(1);
    });
}