/**
 * CheerCast 서버 기본 상태 확인
 */

const { chromium } = require('playwright');

async function checkServerBasic() {
  console.log('🔍 CheerCast 서버 기본 상태 확인...');
  
  const browser = await chromium.launch({ 
    headless: false, // 브라우저 창을 보여줌
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'] 
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const page = await context.newPage();
    
    // 네트워크 요청 모니터링
    page.on('request', request => {
      console.log(`📤 Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📥 Response: ${response.status()} ${response.url()}`);
    });
    
    page.on('requestfailed', request => {
      console.log(`❌ Request Failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    const baseUrl = 'https://cheer-cast-production.up.railway.app';
    
    console.log(`\n🌐 1. 서버 접근성 테스트: ${baseUrl}`);
    
    try {
      // 메인 페이지 접근 시도
      const response = await page.goto(baseUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      console.log(`✅ 서버 응답: ${response.status()}`);
      
      // 페이지 제목 확인
      const title = await page.title();
      console.log(`📄 페이지 제목: "${title}"`);
      
      // 페이지 내용 확인
      const bodyText = await page.locator('body').textContent();
      console.log(`📝 페이지 내용 (첫 200자): "${bodyText?.substring(0, 200)}..."`);
      
    } catch (error) {
      console.log(`❌ 메인 페이지 접근 실패: ${error.message}`);
    }
    
    console.log(`\n🧪 2. API 엔드포인트 직접 테스트`);
    
    // API 엔드포인트들을 개별적으로 테스트
    const endpoints = [
      { name: 'Settings', path: '/api/settings', method: 'GET' },
      { name: 'User Stats', path: '/api/user-stats', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📡 Testing ${endpoint.name}: ${baseUrl}${endpoint.path}`);
        
        const response = await page.goto(`${baseUrl}${endpoint.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        
        console.log(`✅ ${endpoint.name}: ${response.status()}`);
        
        // JSON 응답 확인
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          const text = await page.textContent('body');
          console.log(`📊 Response: ${text?.substring(0, 200)}`);
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint.name} 실패: ${error.message}`);
      }
    }
    
    console.log(`\n🌐 3. 실제 브라우저에서 fetch 테스트`);
    
    // 브라우저에서 실제 fetch 실행
    try {
      await page.goto('https://httpbin.org/html', { waitUntil: 'domcontentloaded' });
      
      const fetchResult = await page.evaluate(async () => {
        try {
          const response = await fetch('https://cheer-cast-production.up.railway.app/api/settings', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            mode: 'cors'
          });
          
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            text: response.ok ? await response.text() : 'Error response'
          };
        } catch (error) {
          return {
            ok: false,
            error: error.message,
            name: error.name
          };
        }
      });
      
      console.log(`📊 Fetch 결과:`, JSON.stringify(fetchResult, null, 2));
      
    } catch (error) {
      console.log(`❌ Fetch 테스트 실패: ${error.message}`);
    }
    
    console.log(`\n⏰ 브라우저를 10초간 열어둡니다. 직접 확인해보세요.`);
    console.log(`🌐 URL: ${baseUrl}`);
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ 서버 상태 확인 실패:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  checkServerBasic()
    .then(() => {
      console.log('🏁 서버 상태 확인 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 서버 상태 확인 실패:', error);
      process.exit(1);
    });
}