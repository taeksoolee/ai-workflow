# 릴리즈 노트

버전별 변경 내역. 각 버전의 배포 커밋에는 `v<버전>` git tag 가 달린다 —
어떤 코드가 어떤 버전인지는 tag 가 정본이다.

## 0.1.1 — 2026-09-26

- **base.md 우선순위 명문화** — base.md 는 기본값이며, 루트 `AI.md` 가 충돌 규칙을
  명시하면(예: 이슈키 커밋 포맷) `AI.md` 쪽이 우선한다. 프로젝트 고유 컨벤션을
  base.md 수정 없이 유지할 수 있다.
- base.md 템플릿의 치환 변수 뒤 조사 오류 수정.

## 0.1.0 — 2026-09-26

최초 배포.

- `aiw` CLI: `init` / `setup` / `mcp` / `gitignore` / `gwt` / `check`
- AI 도구 레지스트리 11종: claude, cursor, kiro, copilot, opencode, codex,
  windsurf, continue, trae, antigravity, vscode
- `.ai-workflow/` SSoT 구조: config.json · mcp.base.json · .env · docs(base.md + 가이드)
- 가이드 frontmatter 기반 스킬 선언 → 도구별 커맨드/스킬 래퍼 자동 생성
- MCP 설정 생성: 값 단위 치환, 빈 크리덴셜 서버 자동 제외, 백업·원자적 교체·권한 600
- `.gitignore` 센티널 블록 관리 (`--check` 로 tracked 파생 파일 검출)
- `gwt`: 워크트리 생성 + 로컬 전용 파일 동기화 + 락파일 기반 패키지 매니저 감지
- MCP 프리셋 6종 (figma · atlassian · github · sentry · slack · supabase)
