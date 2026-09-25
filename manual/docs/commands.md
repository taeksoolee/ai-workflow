# 커맨드 레퍼런스

```
aiw <커맨드> [옵션]
```

공통:
- 모든 커맨드는 `--help` 로 개별 도움말을 출력한다.
- 대화형 확인이 필요한 커맨드는 전부 `--yes`(`-y`) 비대화형 플래그를 지원한다.
  비대화형 환경(파이프·CI)에서 확인이 필요한데 `--yes` 가 없으면 안내와 함께 실패한다.
- `aiw --version` 으로 버전을 출력한다.

## aiw init

```
aiw init [--yes] [--base-branch <브랜치>]
```

대상 프로젝트에 `.ai-workflow/` 스캐폴드와 루트 `AI.md` 를 생성하고 `.gitignore` 블록을 적용한다.

| 옵션 | 설명 |
| --- | --- |
| `--yes`, `-y` | 기존 파일 덮어쓰기 확인(Y/n)을 생략 |
| `--base-branch <브랜치>` | `config.json` 의 `baseBranch` 초기값 (기본 `main`) |

동작 규칙:
- 기존 파일이 있으면 파일별로 덮어쓰기를 확인한다. 내용이 동일하면 조용히 통과한다(멱등).
- `.ai-workflow/.env` 는 **없을 때만** `.env.example` 복사본으로 생성하며(권한 600), 어떤 경우에도 덮어쓰지 않는다.

## aiw setup

```
aiw setup [도구|all] [--yes]
```

포인터 파일과 스킬 래퍼 파일을 생성한다. 도구를 생략하면 `all` (= `config.json` 의 `tools` 전체).

수행 내용 (순서대로):
1. **base.md drift 검사** — `.ai-workflow/docs/base.md` 를 패키지 템플릿의 렌더 결과와 비교, 다르면 갱신.
2. **포인터 파일 생성** — 각 도구가 `AI.md` / `base.md` 를 참조하게 하는 파일 (같은 경로를 쓰는 도구는 한 번만 생성 — 예: `AGENTS.md` 는 codex/opencode 공유).
3. **스킬 래퍼 생성** — `.ai-workflow/docs/*-guide.md` frontmatter 의 `skill` 선언을 스캔해 도구별 포맷으로 생성.
4. **.gitignore 블록 갱신**.

지원 도구: `claude`, `cursor`, `kiro`, `copilot`, `opencode`, `codex`, `windsurf`, `continue`, `trae`, `antigravity`
(`vscode` 는 MCP 전용이라 setup 에서는 포인터/래퍼를 만들지 않는다.)

## aiw mcp

```
aiw mcp <도구|all> [--dry-run] [--yes]
```

`.ai-workflow/mcp.base.json` + `.ai-workflow/.env` 를 합쳐 도구별 MCP 설정 파일을 생성한다.

| 도구 | 출력 파일 | 포맷 |
| --- | --- | --- |
| `claude` | `.mcp.json` | `mcpServers` |
| `cursor` | `.cursor/mcp.json` | `mcpServers` |
| `windsurf` | `.windsurf/mcp.json` | `mcpServers` |
| `vscode` / `copilot` | `.vscode/mcp.json` | `servers` |
| `antigravity` | `.agents/mcp_config.json` | `mcpServers` |
| `kiro` | `.kiro/settings/mcp.json` | `mcpServers` |
| `opencode` | `opencode.json` | `mcp` 키만 병합 (provider 등 기존 설정 보존) |

| 옵션 | 설명 |
| --- | --- |
| `--dry-run`, `-n` | 파일을 쓰지 않고 서버 단위 diff 요약만 출력 |
| `--yes`, `-y` | 덮어쓰기 확인 생략 |

안전장치:
- 치환은 JSON 파싱 후 값 단위로 수행 (토큰의 `"`·`\` 가 JSON 을 깨뜨리지 않음).
- 값이 빈 `${MCP_*}` 크리덴셜이 있는 서버는 통째로 제외하고 사유를 보고.
- diff 요약에서 크리덴셜 필드(env/environment/headers)는 값 대신 "어떤 키가 바뀌었는지"만 표시.
- 덮어쓰기 전 원본을 `.ai-workflow/backup/` 에 타임스탬프 백업(권한 600) → 임시 파일 → 원자적 교체.
- 생성 파일은 토큰을 평문으로 담으므로 항상 권한 600.
- `MCP_NODE_BIN` / `MCP_NPX_BIN` / `MCP_UVX_BIN` 으로 실행기 절대경로 오버라이드 (nvm 다중 node 문제 대응).
- `MCP_SLACK_MODE`(stdio|oauth) 로 `slack` / `slack-oauth` 중 하나만 활성화.
- 셸 환경변수가 `.env` 파일 값보다 우선한다 (CI 주입 경로 보장).

## aiw gitignore

```
aiw gitignore [--check]
```

`.gitignore` 의 센티널 블록(`# >>> ai-workflow >>>` ~ `# <<< ai-workflow <<<`)만 재생성한다.
블록 밖 내용은 절대 건드리지 않는다. 항목의 정본은 도구 레지스트리다.

| 옵션 | 설명 |
| --- | --- |
| `--check` | 쓰지 않고 검사만: 블록 최신 여부 + 파생 파일이 git 에 추적(tracked)되고 있는지. 문제가 있으면 `git rm --cached` 안내와 함께 종료코드 1 |

## aiw gwt

```
aiw gwt <브랜치명> [--no-install]
```

새 git 워크트리를 `../<리포명>-<폴더명>` 에 만들고 브랜치를 생성한다.

- 리포명은 `git rev-parse --show-toplevel` 로 자동 유도.
- `feature/foo` 는 그대로, `feature-foo` 는 `feature/foo` 로 정규화. 폴더명은 슬래시를 하이픈으로.
- git 에 추적되지 않는 로컬 전용 파일(루트 `.env*`, `.ai-workflow/.env` 등)을 새 워크트리로 복사 (권한 유지, backup/logs/tmp 은 제외).
- 락파일로 패키지 매니저(pnpm/yarn/npm/bun)를 감지해 의존성을 설치. `--no-install` 로 생략.

## aiw check

```
aiw check
```

쓰기 없이 상태만 점검한다: 필수 파일 존재(`config.json`, `mcp.base.json`, `docs/base.md`, `AI.md`),
base.md drift, gitignore 블록 상태 + 파생 파일 추적 여부. 문제가 있으면 종료코드 1.
