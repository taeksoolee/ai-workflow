# @taeksoolee/ai-workflow

어떤 AI 에이전트 도구(Claude Code, Cursor, Kiro, Copilot, OpenCode, Codex, Windsurf, Continue, Trae, Antigravity)를
쓰든 **동일한 워크플로우**로 프로젝트를 진행하게 해주는 CLI 도구 `aiw`.

- **단일 진실 공급원(SSoT):** 규칙·스킬·MCP 서버 목록은 `.ai-workflow/` 와 루트 `AI.md` 한 곳에서 관리한다 (커밋 대상).
- **파생 파일 자동 생성:** 도구별 규칙 파일(CLAUDE.md, .cursorrules, ...)·커맨드/스킬 파일·MCP 설정은 전부 파생 산출물로 생성한다 (gitignore 대상, 각자 로컬 생성).
- **zero-dependency:** node 내장 모듈만 사용. 빌드 스텝 없는 plain ESM.

## 보안 규칙

**이 프로젝트는 공개 프로젝트이므로 보안키(크리덴셜)에 더 주의해야 한다.**

- API 토큰·크리덴셜은 오직 `.ai-workflow/.env`(gitignore 대상, 권한 600)에만 둔다. 코드·템플릿·문서·커밋 메시지·이슈 어디에도 실제 값을 적지 않는다.
- 예시가 필요하면 `your-token`, `dummy-...` 같은 자리표시자만 쓴다.
- 커밋 전 `aiw gitignore --check` 로 크리덴셜·파생 파일이 추적되고 있지 않은지 확인한다.

## 설치

```bash
pnpm add -D @taeksoolee/ai-workflow   # 또는 npm install -D
```

Node.js >= 20 필요.

## 빠른 시작

```bash
aiw init                  # .ai-workflow/ 스캐폴드 + AI.md 생성, .gitignore 블록 적용
# → .ai-workflow/.env 에 MCP 크리덴셜 채우기, AI.md 의 PROJECT 슬롯 채우기
aiw setup --yes           # 도구별 포인터 파일 + 스킬 래퍼 생성
aiw mcp claude --dry-run  # MCP 설정 미리보기 → aiw mcp claude 로 실제 생성
aiw check                 # 상태 점검
```

## 커맨드 요약

| 커맨드 | 역할 |
| --- | --- |
| `aiw init` | `.ai-workflow/` 스캐폴드 + 루트 `AI.md` 생성, `.gitignore` 블록 적용 |
| `aiw setup [도구\|all]` | 포인터 파일 + 스킬 래퍼 생성, base.md drift 검사/갱신 |
| `aiw mcp <도구\|all>` | 도구별 MCP 설정 생성 (`--dry-run`, 백업·원자적 교체·권한 600) |
| `aiw gitignore [--check]` | `.gitignore` 센티널 블록 관리/검사 |
| `aiw gwt <브랜치>` | git 워크트리 생성 + 로컬 전용 파일 동기화 + 의존성 설치 |
| `aiw check` | 종합 상태 점검 (쓰기 없음) |

상세 레퍼런스와 개념 설명의 정본은 **[manual/](./manual/README.md)** 에 있다:
[소개](./manual/docs/index.md) · [시작하기](./manual/docs/getting-started.md) ·
[커맨드 레퍼런스](./manual/docs/commands.md) · [프로젝트 구조](./manual/docs/project-structure.md)

## 개발 규칙

- **기능 수정에 문서 수정이 필요하면 반드시 함께 수정한다.** 커맨드·동작·구조 설명의 정본은
  `manual/docs/` 와 `templates/` 다 — 기능 변경이 이 문서들과 어긋나게 되면 같은 커밋(또는 같은 PR)에서
  문서를 갱신한다. 문서가 낡은 채 남는 것은 기능 버그와 동급으로 취급한다.
- 배포 전 `pnpm test` 가 게이트다 (`prepublishOnly`) — workspace 테스트(smoke)와 배포판 tarball
  설치 테스트(pack)를 모두 통과해야 한다.
- **배포 절차** (배포는 수동으로만 한다 — CI 자동 배포 없음):
  1. 버전 bump (`npm version patch|minor --no-git-tag-version`)
  2. **릴리즈 커밋** — 매뉴얼 릴리즈 노트(`manual/docs/changelog.md`)에 이 버전의 변경 내역을
     기록해 버전 bump 와 함께 커밋한다. 배포 직전 마지막 커밋은 항상 이 릴리즈 커밋이다.
  3. `npm publish` (2FA OTP 필요)
  4. **배포가 완료되면 릴리즈 커밋에 `v<버전>` git tag 를 남기고 push 한다**
     (`git tag v0.1.1 && git push --tags`). 어떤 커밋이 어떤 배포 버전인지는 tag 가 정본이다.

## 리포 구성 (개발자용)

| 경로 | 역할 |
| --- | --- |
| `bin/cli.mjs` | CLI 엔트리 (커맨드 라우팅) |
| `src/commands/` | 커맨드 구현 (init/setup/mcp/gitignore/gwt/check) |
| `src/tools/` | 도구 레지스트리 — 도구별 포인터/래퍼/MCP/gitignore 항목의 정본 |
| `src/lib/` | 공용 유틸 (config·env·frontmatter 파서, 원자적 쓰기, 프롬프트 등) |
| `templates/` | `aiw init` 이 복사하는 원본 (`{{BASE_BRANCH}}` 등 치환 변수 사용) |
| `presets/mcp/` | MCP 서버 프리셋 (서버 정의 + 대응 .env 변수 메타) |
| `example/` | 사용 흐름을 리포 안에서 테스트하는 샘플 프로젝트 (workspace) |
| `manual/` | 사용자 매뉴얼 소스 — 독립 배포 예정 (workspace, npm 배포 범위 제외) |
| `test/smoke.mjs` | `node --test` 스모크 테스트 (임시 디렉터리에서 init→setup→mcp→check) |

```bash
pnpm install
pnpm test          # 스모크 테스트
pnpm example:init  # example/ 에서 aiw init --yes 실행 (example/README.md 참조)
```

## 라이선스

MIT
