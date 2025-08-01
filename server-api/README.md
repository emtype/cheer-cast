# 🎈 Cheer Cast API Server

실시간 풍선 애니메이션 제어를 위한 Node.js + React 서버입니다. SSE(Server-Sent Events)를 사용하여 Chrome 확장 프로그램과 실시간으로 통신합니다.

## 🚀 기능

- **실시간 통신**: SSE를 통한 실시간 풍선 개수 및 상태 동기화
- **웹 관리 인터페이스**: React 기반의 직관적인 관리 대시보드
- **API**: RESTful API를 통한 풍선 상태 제어
- **자동 시뮬레이션**: 개발 환경에서 랜덤 풍선 개수 변경

## 📁 프로젝트 구조

```
server-api/
├── server.js          # Express 서버 (Node.js)
├── package.json       # 서버 의존성
├── client/            # React 관리 페이지
│   ├── src/
│   │   ├── App.tsx    # 메인 React 컴포넌트
│   │   └── App.css    # 스타일링
│   └── package.json   # 클라이언트 의존성
└── README.md
```

## 🛠️ 설치 및 실행

### 1. 서버 설치 및 실행

```bash
cd server-api
npm install
npm start
```

### 2. React 클라이언트 설치 및 실행 (개발)

```bash
cd server-api/client
npm install
npm start
```

### 3. 프로덕션 빌드

```bash
cd server-api/client
npm run build
cd ..
npm start
```

## 🌐 API 엔드포인트

### SSE (Server-Sent Events)
- `GET /api/balloon-stream` - 실시간 풍선 상태 스트림

### REST API
- `GET /api/balloon-status` - 현재 풍선 상태 조회
- `POST /api/balloon-count` - 풍선 개수 변경
  ```json
  { "count": 5 }
  ```
- `POST /api/balloon-toggle` - 풍선 활성화/비활성화
  ```json
  { "active": true }
  ```
- `POST /api/simulate` - 랜덤 시뮬레이션 실행

## 📱 웹 관리 페이지

`http://localhost:3001`에서 접속 가능한 관리 인터페이스:

- **실시간 상태 모니터링**: 현재 풍선 개수 및 활성화 상태
- **풍선 개수 조정**: 0-20개 사이에서 실시간 조정
- **활성화 토글**: 풍선 애니메이션 완전 비활성화/활성화
- **시뮬레이션**: 랜덤 테스트를 위한 시뮬레이션 기능

## 🔗 Chrome 확장 프로그램 연동

Chrome 확장 프로그램이 자동으로 `http://localhost:3001/api/balloon-stream`에 연결하여:

1. 실시간 풍선 개수 업데이트 수신
2. 활성화/비활성화 상태 동기화
3. 자동 재연결 (연결 끊어질 시)

## 🎯 사용 시나리오

1. **개발/테스트**: 랜덤 시뮬레이션으로 다양한 풍선 개수 테스트
2. **이벤트 제어**: 특정 이벤트에 맞춰 풍선 개수 실시간 조정
3. **성능 최적화**: 풍선 개수를 0으로 설정하여 성능 영향 최소화
4. **사용자 경험**: 상황에 맞는 적절한 풍선 개수 동적 조정

## 🔧 환경 변수

- `PORT`: 서버 포트 (기본값: 3001)
- `NODE_ENV`: 환경 설정 (`production`에서 랜덤 시뮬레이션 비활성화)

## 🚨 주의사항

- Chrome 확장 프로그램의 `manifest.json`에 서버 권한이 추가되어야 합니다
- CORS 설정으로 `naver.com` 도메인에서의 접근이 허용됩니다
- 개발 환경에서는 30초마다 30% 확률로 랜덤 시뮬레이션이 실행됩니다