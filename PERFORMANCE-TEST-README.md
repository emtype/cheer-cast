# CheerCast Performance Testing

100명의 동시 사용자가 100개의 메시지를 연속으로 보내는 성능 테스트 도구입니다.

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
# 프로젝트 루트에서 실행
npm install
npx playwright install chromium
```

### 2. 서버 실행 확인
테스트 전에 CheerCast 서버가 실행 중인지 확인하세요:
- Production: https://cheer-cast-production.up.railway.app
- Local: http://localhost:3001

### 3. 테스트 실행

#### 빠른 테스트 (추천 - 먼저 실행)
```bash
npm run test:quick
```
- **10명 사용자** × **10개 메시지** = 100개 총 메시지
- **약 30초** 소요
- 기본 성능 확인용

#### 로컬 서버 테스트 (Extension 확인용)
```bash
npm run test:local
```
- **20명 사용자** × **20개 메시지** = 400개 총 메시지
- **localhost:3001** 대상
- **브라우저 창 표시**로 Chrome Extension 확인 가능
- **약 1-2분** 소요

#### Production 대규모 테스트 🚀
```bash
npm run test:prod
```
- **100명 사용자** × **100개 메시지** = 10,000개 총 메시지
- **Production 서버** 대상
- **약 5-10분** 소요
- ⚠️ **Production 서버에 높은 부하**를 가함

#### 풀 로드 테스트 (레거시)
```bash
npm run test:performance
```
- **100명 사용자** × **100개 메시지** = 10,000개 총 메시지
- **약 5-10분** 소요
- ⚠️ **서버에 높은 부하**를 가함

## 📊 테스트 결과 해석

### 성능 지표
- **Messages/Second**: 초당 처리된 메시지 수
- **Success Rate**: 성공적으로 전송된 메시지 비율
- **Response Time**: 평균 API 응답 시간
- **User Success Rate**: 성공적으로 완료된 사용자 비율

### 성능 등급
- 🏆 **EXCELLENT**: >50 msg/s, <500ms 응답시간
- 🎯 **GOOD**: >30 msg/s, <1000ms 응답시간  
- ⚠️ **FAIR**: >15 msg/s, <2000ms 응답시간
- ❌ **POOR**: 그 이하

### 예상 결과 (최적화 후)
```
🎈 CheerCast Performance Test Report
=====================================

📊 Test Configuration:
- Concurrent Users: 100
- Messages per User: 100
- Total Expected Messages: 10,000

⏱️ Timing Results:
- Test Duration: 45.30s
- Messages Sent: 9,847
- Messages/Second: 217.48
- Success Rate: 98.5%

👥 User Statistics:
- Successful Users: 98
- Failed Users: 2
- Success Rate: 98.0%

🚀 Response Time Analysis:
- Average: 245.67ms
- Min: 45ms
- Max: 1,234ms

❌ Error Analysis:
- Total Errors: 23
- Server Errors (4xx/5xx): 8
- Network Errors: 15

🎯 Performance Grade: 🏆 EXCELLENT
```

## 🔧 설정 조정

### 테스트 강도 조절
`performance-test.js`에서 설정 변경:

```javascript
const TEST_CONFIG = {
  CONCURRENT_USERS: 50,    // 사용자 수 (기본: 100)
  MESSAGES_PER_USER: 50,   // 메시지 수 (기본: 100)
  MESSAGE_INTERVAL_MS: 200, // 메시지 간격 (기본: 100ms)
  // ...
};
```

### 서버 URL 변경
로컬 테스트의 경우:
```javascript
SERVER_URL: 'http://localhost:3001'
```

## 🐛 문제 해결

### 일반적인 문제들

#### 1. "Browser not found" 에러
```bash
npx playwright install chromium
```

#### 2. 서버 연결 실패
- 서버가 실행 중인지 확인
- URL이 올바른지 확인
- 방화벽/네트워크 설정 확인

#### 3. 메모리 부족
```bash
# 더 적은 사용자로 테스트
CONCURRENT_USERS=50 npm run test:performance
```

#### 4. 타임아웃 에러
- 서버 응답이 느림 → 서버 성능 최적화 필요
- `TEST_TIMEOUT_MS` 증가

### 테스트 중단
테스트가 너무 오래 걸리거나 문제가 있으면:
```bash
Ctrl + C  # 강제 종료
```

## 📈 성능 모니터링

테스트 실행 중 실시간 모니터링:
```
📊 [45.2s] Messages: 8,234, Users: 95/100, Avg Response: 156.3ms, Errors: 12
```

- **Messages**: 현재까지 전송된 메시지 수
- **Users**: 완료된 사용자 / 전체 사용자
- **Avg Response**: 평균 응답 시간
- **Errors**: 누적 오류 수

## ⚠️ 주의사항

1. **Production 서버 테스트 주의**: 실제 사용자에게 영향을 줄 수 있음
2. **로컬 테스트 권장**: 개발 환경에서 먼저 테스트
3. **점진적 테스트**: 작은 규모부터 시작해서 단계적으로 증가
4. **서버 리소스 모니터링**: CPU, 메모리 사용량 확인

## 🎯 최적화 확인 포인트

이 테스트로 확인할 수 있는 최적화 효과:

- ✅ **비동기 브로드캐스트**: 병렬 처리로 처리량 증가
- ✅ **큐 배치 처리**: 클라이언트 측 처리 속도 향상  
- ✅ **Rate Limiting 완화**: 더 많은 요청 처리 가능
- ✅ **메모리 누수 방지**: 안정적인 장시간 운영