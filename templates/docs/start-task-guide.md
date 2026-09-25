---
skill:
  name: start-task
  description: 이슈·요구사항을 분석해 작업 맥락을 파악하고 origin/{{BASE_BRANCH}} 베이스로 브랜치를 생성합니다. 새 작업을 시작할 때 사용하세요.
  type: command
---

# 작업 시작 가이드 (start-task)

이슈(또는 사용자 설명)를 분석해 작업 맥락을 파악하고, `origin/{{BASE_BRANCH}}` 베이스로 브랜치를 생성하는 절차를 정의한다.

<!-- PROJECT: 이슈 트래커(Jira/GitHub Issues 등) 연동 절차가 있으면 이 문서에 구체화하세요. -->

## 호출 형태

```
/start-task [이슈 URL 또는 작업 설명]
```

## 절차

### 1. 맥락 수집

- 이슈 URL 이 주어지면 연동된 MCP·CLI 로 이슈를 조회해 제목·설명·댓글·연결 문서를 파악한다.
- URL 이 없으면 사용자에게 어떤 작업을 할지 간단히 설명해 달라고 질문한다.
- 수집한 맥락을 3~5줄로 요약해 사용자에게 보여주고, 이해가 맞는지 확인한다.

### 2. 브랜치 생성

- 브랜치명은 `<prefix>/<간결한-영문-슬러그>` 형태로 제안한다. prefix 는 작업 성격에 맞게 고른다: {{BRANCH_PREFIXES}}
- `.ai-workflow/docs/base.md` 의 브랜치 규칙을 따른다:

  ```
  git fetch origin
  git checkout -b <prefix>/<slug> origin/{{BASE_BRANCH}}
  git log --oneline -1   # 베이스 확인
  ```

- 미커밋 변경사항이 있으면 브랜치 전환 전에 사용자에게 처리 방법(커밋/스태시)을 확인한다.

### 3. 작업 맥락 기록

- 1단계 요약을 `.ai-workflow/tmp/<브랜치명의 슬래시를 하이픈으로 바꾼 이름>/context.md` 로 남긴다. 진행하면서 결정 사항·막힌 지점을 덧붙여 갱신한다.
- 작업을 이어서 시작할 때는 이 파일을 먼저 읽는다.
