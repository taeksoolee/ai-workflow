# 시작하기

## 요구 사항

- Node.js >= 20
- git

## 설치

```bash
# 프로젝트 devDependency 로 (권장)
pnpm add -D @taeksoolee/ai-workflow
# 또는
npm install -D @taeksoolee/ai-workflow

# 일회성 실행
pnpm dlx @taeksoolee/ai-workflow init
npx @taeksoolee/ai-workflow init
```

설치하면 `aiw` 실행 파일이 생긴다. 이하 예시는 `pnpm exec aiw ...` 형태를 줄여 `aiw ...` 로 적는다.

## 1. init — 스캐폴드 생성

```bash
aiw init            # 대화형 (기존 파일이 있으면 Y/n 확인)
aiw init --yes      # 비대화형
aiw init --base-branch develop   # 베이스 브랜치가 main 이 아니면
```

`.ai-workflow/` 디렉터리와 루트 `AI.md` 가 생기고, `.gitignore` 에 ai-workflow 블록이 추가된다.
자세한 구조는 [프로젝트 구조](./project-structure.md) 참조.

init 직후 할 일:

1. `.ai-workflow/.env` 에 MCP 크리덴셜 값을 채운다 (파일은 권한 600, 절대 커밋 금지).
2. `AI.md` 의 `<!-- PROJECT: ... -->` 슬롯을 프로젝트에 맞게 채운다.
3. `.ai-workflow/config.json` 에서 `baseBranch`, `tools` 등을 조정한다.
4. `.ai-workflow/` 의 SSoT 파일들과 `AI.md`, `.gitignore` 변경을 **커밋한다**.

## 2. setup — 도구별 파일 생성

```bash
aiw setup --yes          # config.json 의 tools 전체
aiw setup claude --yes   # 특정 도구만
```

각 도구용 포인터 파일(CLAUDE.md, .cursorrules, ...)과, `.ai-workflow/docs/*-guide.md` 의
frontmatter 스킬 선언을 스캔해 커맨드/스킬 래퍼 파일을 생성한다.
생성물은 전부 gitignore 대상 — **커밋하지 않고**, 팀원 각자가 로컬에서 실행한다.

## 3. mcp — MCP 설정 생성

```bash
aiw mcp claude --dry-run   # 무엇이 생성될지 먼저 확인
aiw mcp claude             # .mcp.json 생성 (권한 600)
aiw mcp all --yes          # MCP 를 지원하는 활성 도구 전체
```

`.ai-workflow/mcp.base.json` 의 `${MCP_*}` 플레이스홀더를 `.ai-workflow/.env` 값으로 치환한다.
값이 빈 크리덴셜의 서버는 자동 제외되고 무엇이 왜 빠졌는지 알려준다.

## 4. 일상 사용

```bash
aiw check              # 상태 점검 (base.md drift, gitignore 블록, 필수 파일)
aiw gitignore --check  # gitignore 블록만 검사
aiw gwt feature/foo    # 새 워크트리 + 브랜치 + 로컬 파일 동기화 + 의존성 설치
```

새 팀원 온보딩은 `git clone` → `pnpm install` → `.env` 채우기 → `aiw setup --yes && aiw mcp all --yes` 로 끝난다.
