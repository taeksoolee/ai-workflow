# @taeksoolee/ai-workflow (aiw)

어떤 AI 에이전트 도구를 쓰든 **동일한 워크플로우**로 프로젝트를 진행하게 해주는 CLI 도구다.

## 왜 필요한가

AI 에이전트 도구(Claude Code, Cursor, Kiro, Copilot, OpenCode, Codex, Windsurf, Continue, Trae, Antigravity)는
저마다 다른 위치·포맷의 설정 파일을 요구한다 — 규칙 파일(CLAUDE.md, .cursorrules, ...),
커맨드/스킬 파일(.claude/skills/, .cursor/commands/, ...), MCP 설정(.mcp.json, .cursor/mcp.json, ...).

도구마다 규칙을 따로 관리하면 반드시 갈라진다. aiw 는 **단일 진실 공급원(SSoT)** 을
`.ai-workflow/` 한 곳에 두고, 도구별 파일은 전부 **파생 산출물**로 자동 생성한다.

## 핵심 개념

- **SSoT 는 `.ai-workflow/` 와 루트 `AI.md`** — 커밋해서 팀이 공유한다.
- **파생 파일은 각 도구가 요구하는 원래 위치에 생성** — 전부 gitignore 대상이고 각자 로컬에서 `aiw setup` / `aiw mcp` 로 생성한다.
- **스킬 선언은 가이드 문서의 frontmatter** — `.ai-workflow/docs/*-guide.md` 상단에 `skill: {name, description, type}` 을 선언하면 `aiw setup` 이 스캔해 10개 도구의 커맨드/스킬 포맷으로 배포한다. 별도 매니페스트는 없다.
- **공통 규칙은 패키지가 관리** — `.ai-workflow/docs/base.md` 는 패키지 템플릿에서 생성되는 관리 파일로, `aiw setup` 이 drift 를 검사·갱신한다.

## 문서

- [시작하기](./getting-started.md) — 설치부터 첫 설정까지
- [커맨드 레퍼런스](./commands.md) — 모든 커맨드와 옵션
- [프로젝트 구조](./project-structure.md) — `.ai-workflow/` 안에 무엇이 있는지
- [릴리즈 노트](./changelog.md) — 버전별 변경 내역
