# 🎯 Multitasker

ADHD 친화적 멀티태스킹 할일 관리 앱

## ✨ 주요 기능

- **AI 자동 분할**: 큰 할일을 Claude AI가 작은 단위로 자동 분할
- **멀티태스킹 지원**: 여러 작업을 동시에 진행 가능
- **체크박스 관리**: 서브태스크를 체크박스로 간편하게 관리
- **진행률 시각화**: 각 작업의 완료도를 한눈에 확인
- **ADHD 특화 설계**: 집중력과 실행력을 높이는 UI/UX

## 🚀 시작하기

### 로컬 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
# .env.local 파일을 만들고 Claude API 키 설정
ANTHROPIC_API_KEY=your_api_key_here

# 개발 서버 실행
npm run dev
```

### 배포

이 앱은 Vercel에 최적화되어 있습니다.

1. GitHub에 코드 푸시
2. Vercel에서 repository import
3. 환경변수 `ANTHROPIC_API_KEY` 설정
4. 자동 배포 완료!

## 📁 프로젝트 구조

```
multitasker/
├── pages/
│   ├── index.js          # 메인 앱 컴포넌트
│   └── api/
│       └── break-down-task.js  # Claude API 연동
├── styles/
│   └── globals.css       # 전역 스타일
├── package.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 💡 사용 방법

1. **To do**에 큰 할일 입력 (예: "방 청소하기")
2. **시작** 버튼 클릭 → AI가 자동으로 작은 단위로 분할
3. **Doing** 영역에서 체크박스로 서브태스크 완료
4. 모든 서브태스크 완료 시 자동으로 **Done**으로 이동

## 🛠 기술 스택

- **Frontend**: Next.js, React, Tailwind CSS
- **API**: Claude 3.5 Sonnet
- **Icons**: Lucide React
- **Deployment**: Vercel

## 📝 라이선스

MIT License

## 🤝 기여하기

이슈 및 풀 리퀘스트는 언제든지 환영합니다!

---

Made with ❤️ for the ADHD community