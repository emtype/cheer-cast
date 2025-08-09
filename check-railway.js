/**
 * Railway 서버 상태 및 URL 확인
 */

const { chromium } = require('playwright');

async function checkRailwayServer() {
  console.log('🚂 Railway 서버 상태 확인...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 여러 가능한 URL들을 확인
    const possibleUrls = [
      'https://cheer-cast-production.up.railway.app',
      'https://cheercast-production.up.railway.app', 
      'https://cheer-cast.up.railway.app',
      'https://cheercast.up.railway.app'
    ];
    
    console.log('🔍 가능한 Railway URL들을 확인 중...\n');
    
    for (const url of possibleUrls) {
      console.log(`📡 테스트 중: ${url}`);
      
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        console.log(`✅ 응답: ${response.status()} ${response.statusText()}`);
        
        // 페이지 내용 확인
        const title = await page.title();
        const bodyText = await page.textContent('body');
        
        console.log(`📄 제목: "${title}"`);
        console.log(`📝 내용: "${bodyText?.substring(0, 100)}..."`);
        
        // API 엔드포인트 확인
        try {
          const apiResponse = await page.goto(`${url}/api/settings`, {
            waitUntil: 'domcontentloaded',
            timeout: 5000
          });
          
          console.log(`🔧 API 응답: ${apiResponse.status()}`);
          if (apiResponse.ok) {
            const apiText = await page.textContent('body');
            console.log(`📊 API 데이터: ${apiText?.substring(0, 100)}`);
            console.log(`🎯 이 URL이 정상적으로 작동합니다!`);
          }
        } catch (apiError) {
          console.log(`❌ API 테스트 실패: ${apiError.message}`);
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`❌ 접근 실패: ${error.message}`);
        console.log('');
      }
    }
    
    // Railway 로그인 페이지에서 실제 URL 확인
    console.log('🚂 Railway 대시보드 확인 (참고용)');
    console.log('1. https://railway.app 에 로그인');
    console.log('2. CheerCast 프로젝트 선택'); 
    console.log('3. "Settings" → "Domains" 에서 실제 URL 확인');
    console.log('4. "Deployments" 에서 최신 배포 상태 확인');
    console.log('');
    
    // 로컬 서버 확인
    console.log('🏠 로컬 서버도 확인해보겠습니다...');
    try {
      const localResponse = await page.goto('http://localhost:3001', {
        waitUntil: 'domcontentloaded',
        timeout: 5000
      });
      
      console.log(`✅ 로컬 서버: ${localResponse.status()}`);
      console.log('💡 로컬 서버가 실행 중입니다. npm run test:local 을 사용하세요.');
      
    } catch (error) {
      console.log(`❌ 로컬 서버: ${error.message}`);
      console.log('💡 로컬 서버를 실행하려면: cd server-api && npm start');
    }
    
  } catch (error) {
    console.error('❌ Railway 확인 실패:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  checkRailwayServer()
    .then(() => {
      console.log('🏁 Railway 확인 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Railway 확인 실패:', error);
      process.exit(1);
    });
}