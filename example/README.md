# example — aiw 사용 흐름 테스트

배포 후 사용 흐름을 리포 안에서 그대로 재현하는 샘플 프로젝트다.
`@taeksoolee/ai-workflow` 를 `workspace:*` 로 참조하므로 루트에서 `pnpm install` 만 하면 `aiw` 를 쓸 수 있다.

## 테스트 절차

```bash
# 리포 루트에서
pnpm install

# example 디렉터리에서
cd example
pnpm aiw:init             # .ai-workflow/ + AI.md 생성, .gitignore 블록 적용 (= aiw init --yes)
pnpm aiw:setup            # 포인터 파일 + 스킬 래퍼 생성 (= aiw setup --yes)
pnpm aiw:mcp              # MCP 설정 dry-run (= aiw mcp claude --dry-run)
pnpm aiw:check            # 종합 점검 (= aiw check)
pnpm aiw:gitignore-check  # gitignore 블록 검사 (= aiw gitignore --check)

# 임의 커맨드는 pnpm exec 로 직접 실행
pnpm exec aiw mcp all --dry-run
pnpm exec aiw setup claude --yes
```

MCP dry-run 에서 서버가 포함되게 하려면 `.ai-workflow/.env` 에 크리덴셜 값을 하나 이상 채운다
(값이 비어 있는 서버는 자동 제외된다).

## 산출물 정리

`aiw` 실행 산출물(`.ai-workflow/`, `AI.md`, 포인터/래퍼 파일 등)은 이 디렉터리의 `.gitignore` 로
전부 제외되어 있어 example/ 은 항상 커밋 가능한 깨끗한 상태를 유지한다.
단, `aiw init`/`aiw setup` 은 이 디렉터리의 `.gitignore` 끝에 ai-workflow 센티널 블록을 추가하므로
그 파일만 수정 상태가 된다. 전체를 리셋하려면:

```bash
git clean -fdx example/
git checkout -- example/.gitignore
```

자동화된 검증은 리포 루트의 `pnpm test` (test/smoke.mjs — 임시 디렉터리 복사본에서 실행) 를 사용한다.
