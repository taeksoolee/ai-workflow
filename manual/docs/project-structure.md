# 프로젝트 구조

`aiw init` 이 대상 프로젝트에 만드는 구조와 각 파일의 소유권을 설명한다.

## 전체 구조

```
.ai-workflow/            # SSoT + 상태 전용. 파생 파일은 절대 여기 안 둠
├── .env.example         # 커밋 — MCP 크리덴셜 템플릿
├── .env                 # ignore, 권한 600 — 실제 크리덴셜 (절대 커밋 금지)
├── config.json          # 커밋 — 프로젝트 설정
├── mcp.base.json        # 커밋 — MCP 서버 목록 (${MCP_*} 플레이스홀더)
├── docs/
│   ├── base.md          # 커밋 — 패키지 관리 파일 (generated 헤더, drift 검사 대상)
│   └── *-guide.md       # 커밋 — 절차 가이드 (frontmatter 로 스킬 선언)
├── logs/                # ignore — 작업 로그
├── tmp/                 # ignore — 에이전트 스크래치
└── backup/              # ignore — aiw mcp 의 덮어쓰기 백업
AI.md                    # 루트 진입점 — 첫 줄에서 base.md 강제 참조 + PROJECT 슬롯
```

파생 파일(CLAUDE.md, AGENTS.md, .cursorrules, .claude/skills/, .cursor/commands/,
.github/prompts/, .mcp.json 등)은 각 도구가 요구하는 **원래 위치**에 생성되며 전부 gitignore 대상이다.

## config.json

```json
{
  "baseBranch": "main",
  "branchPrefixes": ["feature", "fix", "hotfix", "release", "chore", "refactor", "docs", "test"],
  "commitFormat": "conventional",
  "ignoreDerived": true,
  "tools": ["claude", "cursor", "kiro", "copilot", "opencode", "codex", "windsurf", "continue", "trae", "antigravity", "vscode"]
}
```

| 키 | 기본값 | 설명 |
| --- | --- | --- |
| `baseBranch` | `"main"` | 새 브랜치를 딸 베이스 (`origin/<baseBranch>`). base.md 렌더에 반영 |
| `branchPrefixes` | feature, fix, hotfix, release, chore, refactor, docs, test | 허용 브랜치 prefix |
| `commitFormat` | `"conventional"` | `feat:` 등 prefix 필수, 이슈키 없음. 다른 포맷이 필요하면 `AI.md` 에 명시해 오버라이드 |
| `ignoreDerived` | `true` | 파생 파일을 gitignore 블록에 포함할지 |
| `tools` | 전체 | `aiw setup all` / `aiw mcp all` 의 대상 도구 |

파일에 일부 키만 적으면 나머지는 기본값이 적용된다 (기본값 + 오버라이드 패턴).

## docs/base.md — 패키지 관리 파일

모든 리포에서 참이고, 기계(훅/CI)가 강제하지 못하며, AI 가 실제로 틀리는 지점만 담은 공통 규칙 문서다.
상단에 generated 헤더가 있고 **직접 수정하지 않는다** — `aiw setup` 이 패키지 템플릿과 비교해
drift 를 감지하면 갱신한다. 프로젝트 고유 규칙은 `AI.md` 에 쓴다.

**우선순위:** base.md 는 기본값이다. 루트 `AI.md` 가 충돌하는 규칙을 명시하면(예: 이슈키
커밋 포맷을 쓰는 프로젝트) **`AI.md` 쪽이 우선한다.** base.md 를 고치는 게 아니라 `AI.md` 의
해당 섹션에 프로젝트 규칙을 적는 방식으로 오버라이드한다.

## docs/*-guide.md — 스킬 선언 (SSoT)

가이드 문서 상단 frontmatter 에 스킬을 선언하면 `aiw setup` 이 스캔해서 도구별 래퍼를 생성한다.
별도 JSON 매니페스트는 없다 — 가이드 문서가 곧 선언이다.

`aiw init` 이 스켈레톤 3종을 복사해 준다 (프로젝트 소유 — 자유롭게 수정):

- `init-ai-guide.md` — **`/init-ai`**: 프로젝트를 분석해 AI.md 슬롯을 채우거나 문서를 재점검
- `start-task-guide.md` — `/start-task`: 이슈 분석 + 브랜치 생성
- `pr-review-guide.md` — `/pr-review`: PR 리뷰 절차

```markdown
---
skill:
  name: start-task
  description: 새 작업을 시작할 때 사용하세요.
  type: command
---

# 작업 시작 가이드
...절차 본문...
```

- `name` — 커맨드/스킬 이름 (`/start-task` 처럼 호출된다)
- `description` — 도구가 노출하는 설명. `type: skill` 이면 모델이 이 설명으로 자동 발동을 판단한다
- `type` — `command`(사용자가 /명령으로 직접 발동) 또는 `skill`(모델이 상황을 감지해 자동 발동)

파일명이 `*-guide.md` 인 문서만 스캔 대상이다. 래퍼 파일은 절차를 중복 기술하지 않고
가이드 문서를 가리키기만 한다.

## 도구별 파생 파일 위치

| 도구 | 포인터 | 커맨드/스킬 래퍼 |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` | `.claude/skills/{name}/SKILL.md` (command 는 `disable-model-invocation: true`) |
| Cursor | `.cursorrules` | `.cursor/commands/{name}.md` / `.cursor/skills/{name}/SKILL.md` |
| Kiro | `.kiro/steering/guidelines.md` | `.kiro/skills/{name}/SKILL.md` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.github/prompts/{name}.prompt.md` / `.github/skills/{name}/SKILL.md` |
| OpenCode | `AGENTS.md` | `.opencode/command/{name}.md` / `.opencode/skills/{name}/SKILL.md` |
| Codex | `AGENTS.md` (공유) | `.agents/skills/{name}/SKILL.md` (`$name` 멘션 호출) |
| Windsurf | `.windsurfrules` | `.windsurf/workflows/{name}.md` / `.windsurf/skills/{name}/SKILL.md` |
| Continue | `.continue/rules/guidelines.md` | `.continue/prompts/{name}.prompt` |
| Trae | `.traerules` | `.trae/skills/{name}/SKILL.md` |
| Antigravity | `GEMINI.md` | `.agent/workflows/{name}.md` / `.agent/skills/{name}/SKILL.md` |
| VS Code | — (MCP 전용) | — |

MCP 출력 위치는 [커맨드 레퍼런스](./commands.md#aiw-mcp)의 표를 참조.

## .gitignore 센티널 블록

```
# >>> ai-workflow >>>
...자동 생성 항목...
# <<< ai-workflow <<<
```

`aiw init` / `aiw setup` / `aiw gitignore` 가 이 블록만 재생성하며 블록 밖은 불변이다.
항목의 정본은 도구 레지스트리(각 도구 정의의 `gitignoreEntries`)다.
