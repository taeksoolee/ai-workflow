# manual — 사용자 매뉴얼

`@taeksoolee/ai-workflow` (aiw) 의 사용자 매뉴얼 소스다. pnpm workspace 멤버이며,
**독립적으로 배포 가능한 매뉴얼 사이트**의 자리로 예약되어 있다.

## 배포 방식 (확정)

- 매뉴얼 본문은 `docs/` 아래 **순수 마크다운**으로 관리한다. 리포에는 빌드 도구를 두지 않는다.
- 배포는 **GitHub Pages** — main 브랜치에 `manual/docs/**` 변경이 push 되면
  `.github/workflows/deploy-manual.yml` 이 GitHub 내장 Jekyll 빌더로 변환해 배포한다.
- 문서 간 링크는 상대 `.md` 경로로 적는다 (`./commands.md`). Pages 빌드가 `.html` 로 변환한다.
- 테마·사이트 메타는 `docs/_config.yml` 에서 관리한다 (jekyll-theme-primer).
- **최초 1회 설정:** GitHub 리포의 Settings → Pages → Source 를 "GitHub Actions" 로 변경해야 한다.

## 문서 구성

| 파일 | 내용 |
| --- | --- |
| `docs/index.md` | 소개 — aiw 가 무엇이고 왜 쓰는지 |
| `docs/getting-started.md` | 설치 → init → setup → mcp 흐름 |
| `docs/commands.md` | 커맨드 레퍼런스 (정본 — 루트 README 는 요약만 둔다) |
| `docs/project-structure.md` | 대상 프로젝트의 `.ai-workflow/` 구조 설명 |

## 추후 결정 필요

- 매뉴얼 버저닝 정책 (패키지 버전과 문서 버전을 묶을지). 당분간은 최신판 단일 배포.

npm 패키지 배포 범위(루트 `package.json` 의 `files`)에는 `manual/` 이 포함되지 않는다 —
매뉴얼은 패키지가 아니라 사이트로 배포한다.
