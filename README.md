# 🎈 CheerCast 

실시간 풍선과 메시지로 응원하는 Chrome 확장 프로그램 및 웹 애플리케이션입니다.

## 프로젝트 구조

```
cheer-cast/
├── chrome-extension/          # Chrome 확장 프로그램
│   ├── content.js            # 컨텐츠 스크립트
│   ├── manifest.json         # 확장 프로그램 설정
│   ├── balloon-animation.css # 풍선 애니메이션 스타일
│   └── images/              # 풍선 이미지들
├── server-api/              # Node.js API 서버
│   ├── server.js           # Express 서버
│   ├── client/             # React 관리자 인터페이스
│   │   ├── src/           # React 소스 코드
│   │   └── public/        # 정적 파일들
│   └── package.json       # 서버 의존성
└── README.md
```

## ✨ 주요 기능

- **실시간 풍선 애니메이션**: 6가지 색상의 풍선과 "이해했어요" 버튼
- **Server-Sent Events(SSE)**: 실시간 이벤트 스트리밍
- **텍스트 메시지**: 120자 이하의 실시간 메시지 전송
- **사용자 통계**: 현재 접속자 수 및 총 방문자 수 추적
- **관리자 인터페이스**: React 기반 관리 페이지
- **Chrome 확장 프로그램**: 모든 웹사이트에서 사용 가능

## 🚀 시작하기

### 필수 요구사항

- Node.js (14.0.0 이상)
- Chrome 브라우저
- yarn 또는 npm

### 설치 및 실행

#### 1. API 서버 실행

```bash
cd server-api
yarn install
yarn start
```

서버는 `http://localhost:3001`에서 실행됩니다.

#### 2. React 클라이언트 개발 모드 (선택사항)

```bash
cd server-api/client
yarn install
yarn start
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

#### 3. Chrome 확장 프로그램 설치

1. Chrome에서 `chrome://extensions/` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `chrome-extension` 폴더 선택

## 📡 API 엔드포인트

### SSE (Server-Sent Events)
- `GET /api/balloon-stream` - 실시간 이벤트 스트림 구독

### 풍선 및 메시지
- `POST /api/balloon-click` - 풍선 클릭 이벤트 전송
- `POST /api/understand-click` - "이해했어요" 클릭 이벤트 전송
- `POST /api/send-message` - 텍스트 메시지 전송

### 설정 관리
- `GET /api/settings` - 앱 설정 조회
- `POST /api/settings` - 앱 설정 업데이트 (관리자용)

### 사용자 통계
- `POST /api/user-join` - 사용자 접속 등록
- `POST /api/user-leave` - 사용자 접속 해제
- `GET /api/user-stats` - 사용자 통계 조회

## 🎨 풍선 타입

- `balloon1` - 빨간색 풍선
- `balloon2` - 파란색 풍선
- `balloon3` - 노란색 풍선
- `balloon4` - 초록색 풍선
- `balloon5` - 보라색 풍선
- `balloon6` - 분홍색 풍선
- `understand` - "이해했어요" 버튼

## 🔧 개발 스크립트

### API 서버
```bash
yarn start          # 프로덕션 모드로 서버 시작
yarn dev            # 개발 모드 (nodemon 사용)
yarn build          # 클라이언트 빌드
```

### React 클라이언트
```bash
yarn start          # 개발 서버 시작
yarn build          # 프로덕션 빌드
yarn test           # 테스트 실행
```

### Chrome 확장 프로그램
```bash
yarn build          # 확장 프로그램 준비 완료 메시지
yarn dev            # 개발 모드 안내
yarn package        # ZIP 파일로 패키징
```

## 🌐 CORS 설정

서버는 다음 도메인에서의 요청을 허용합니다:
- `http://localhost:3000` (개발 환경)
- `https://naver.com`
- `https://*.naver.com`

## 📱 사용 방법

1. API 서버를 실행합니다
2. Chrome 확장 프로그램을 설치합니다
3. 웹사이트를 방문하면 우측 하단에 풍선 버튼들이 나타납니다
4. 풍선을 클릭하거나 메시지를 입력하여 실시간으로 응원할 수 있습니다
5. 관리자는 `http://localhost:3001`에서 통계와 설정을 관리할 수 있습니다

## 🔒 보안 기능

- Helmet 미들웨어를 통한 기본 보안 헤더 설정
- CORS 정책을 통한 도메인 제한
- 입력 데이터 검증 (메시지 길이, 제목 길이 등)
- XSS 방지를 위한 입력 sanitization

## 📄 라이선스

MIT License

## 🤝 기여하기

1. 이 저장소를 Fork 합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 🐛 버그 리포트

버그를 발견하셨다면 [Issues](../../issues) 페이지에서 새로운 이슈를 생성해 주세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 통해 연락해 주세요.
