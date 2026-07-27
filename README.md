# AI Story Studio

이야기 만들기 → 직접 녹음 확인 → 영어/일본어/중국어/태국어 번역 → 제목/해시태그 → 복사까지 한 화면에서 이어서 처리하는 PC 웹 도구입니다.

## 1. 설치

Node.js 22 이상 권장.

```bash
npm install
```

## 2. `.env.local` 작성

`.env.example`을 복사합니다.

```bash
cp .env.example .env.local
```

필수 키:

- `OPENCODE_ZEN_API_KEY`: 원고/수정/번역/메타데이터/AI 도우미
- `GROQ_API_KEY`: 음성 전사, 필요 시 text fallback

모델명은 환경변수에서 바꿀 수 있습니다. 브라우저 코드에는 API Key를 넣지 않습니다.

로컬 UI workflow만 점검할 때는 `.env.local`에서 `AI_MOCK_MODE=true`로 설정할 수 있습니다. 실제 서비스 사용 전에는 `false`로 되돌립니다.

## 3. 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 4. 사용하는 방법

1. 새 작업에서 추천 주제 또는 직접 주제를 선택합니다.
2. 부처님/예수님/일반 위로 스타일과 분량을 정하고 이야기를 만듭니다.
3. 원고를 직접 편집하거나 오른쪽 AI 도우미의 수정안을 확인한 뒤 **적용**합니다.
4. **완성하고 다음**을 누르고 녹음 파일을 올립니다.
5. 전사문과 원문을 비교해 실제 다른 부분만 확인합니다.
6. 해외용 만들기로 넘어가면 영어 → 일본어 → 중국어 → 태국어 순서로 자동 생성됩니다.
7. 번역문/제목/해시태그 또는 전체 결과를 복사합니다.

## 5. AI Key 설정

```env
OPENCODE_ZEN_API_KEY=
OPENCODE_ZEN_BASE_URL=https://opencode.ai/zen/v1
ZEN_PRIMARY_MODEL=deepseek-v4-flash-free

GROQ_API_KEY=
GROQ_TRANSCRIPTION_MODEL=whisper-large-v3
GROQ_TRANSCRIPTION_FAST_MODEL=whisper-large-v3-turbo
GROQ_TEXT_MODEL=
```

`GROQ_TEXT_MODEL`이 비어 있으면 Zen text 요청 실패 시 Groq text fallback은 사용하지 않습니다.

## 6. 데이터 저장 위치

로그인/DB 없이 브라우저 `localStorage`의 `ai-story-studio.projects.v1` 키에 작업 텍스트를 저장합니다.

저장 대상: 원고, 전사문, 비교 결과, 번역, 제목, 해시태그, AI 대화, 현재 단계.

오디오 원본 파일은 장기 저장하지 않습니다.

## 7. 백업

왼쪽 아래 **작업 백업**으로 JSON 파일을 내려받습니다.

**백업 불러오기**는 schema 검증에 성공한 경우에만 현재 목록을 교체합니다. 잘못된 JSON 파일이면 기존 데이터는 유지됩니다.

## 검증 명령

```bash
npm run test:pure
npm run lint
npm run typecheck
npm run build
```

`test:pure`에는 원문/전사문 동일 시 절대 오타를 만들지 않는 회귀 테스트가 포함되어 있습니다.
