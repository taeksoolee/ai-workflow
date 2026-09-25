/**
 * NOTE: `aiw init` — 대상 프로젝트에 `.ai-workflow/` 스캐폴드와 루트 AI.md 를 생성한다.
 *
 * 생성 내용:
 *   .ai-workflow/config.json        프로젝트 설정 (커밋)
 *   .ai-workflow/mcp.base.json      MCP 서버 목록, ${MCP_*} 플레이스홀더 (커밋)
 *   .ai-workflow/.env.example       크리덴셜 템플릿 (커밋)
 *   .ai-workflow/.env               .env.example 복사본, 권한 600 (ignore — 없을 때만 생성)
 *   .ai-workflow/docs/base.md       패키지 관리 공통 규칙 (generated 헤더 + drift 검사 대상)
 *   .ai-workflow/docs/*-guide.md    스킬 frontmatter 를 포함한 절차 가이드 스켈레톤
 *   .ai-workflow/logs|tmp|backup/   ignore 대상 디렉터리 (.gitkeep)
 *   AI.md                           루트 진입점 (base.md 강제 참조 + PROJECT 슬롯)
 *   .gitignore                      ai-workflow 센티널 블록 적용
 *
 * 기존 파일은 덮어쓰기 확인(Y/n), --yes 로 생략. .env 는 크리덴셜이 담기므로 절대 덮어쓰지 않는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/args.mjs';
import { AIW_DIR, DEFAULT_CONFIG, loadConfig } from '../lib/config.mjs';
import { ensureDir, writeWithConfirm, atomicWrite } from '../lib/fsx.mjs';
import { readTemplate, renderTemplate, templateVars } from '../lib/template.mjs';
import { syncGitignore } from './gitignore.mjs';
import { ok, info, step } from '../lib/output.mjs';

export const run = async argv => {
  const { flags } = parseArgs(argv, {
    yes: ['--yes', '-y'],
    baseBranch: { flags: ['--base-branch'], value: true },
  });
  const yes = flags.yes;
  const root = process.cwd();

  step(`'${AIW_DIR}/' 스캐폴드를 생성합니다...`);

  // 1. 디렉터리 골격
  for (const dir of ['docs', 'logs', 'tmp', 'backup']) {
    ensureDir(path.join(root, AIW_DIR, dir));
  }
  for (const dir of ['logs', 'tmp', 'backup']) {
    const keep = path.join(root, AIW_DIR, dir, '.gitkeep');
    if (!fs.existsSync(keep)) fs.writeFileSync(keep, '');
  }

  // 2. config.json — 템플릿 기본값에 --base-branch 오버라이드 적용
  const baseBranch = flags.baseBranch ?? DEFAULT_CONFIG.baseBranch;
  const configContent = renderTemplate(readTemplate('config.json'), { BASE_BRANCH: baseBranch });
  await writeWithConfirm(path.join(root, AIW_DIR, 'config.json'), configContent, { label: '프로젝트 설정', yes });

  // NOTE: 이후 템플릿 치환은 방금 쓴(또는 이미 있던) config 를 기준으로 한다.
  const config = loadConfig(root);
  const vars = templateVars(config);

  // 3. SSoT 파일들
  await writeWithConfirm(path.join(root, AIW_DIR, 'mcp.base.json'), readTemplate('mcp.base.json'), {
    label: 'MCP 서버 목록',
    yes,
  });
  await writeWithConfirm(path.join(root, AIW_DIR, '.env.example'), readTemplate('env.example'), {
    label: 'MCP 크리덴셜 템플릿',
    yes,
  });

  // 4. .env — 크리덴셜 파일이므로 없을 때만 생성하고 절대 덮어쓰지 않는다. 권한 600.
  const envPath = path.join(root, AIW_DIR, '.env');
  if (!fs.existsSync(envPath)) {
    atomicWrite(envPath, readTemplate('env.example'), { mode: 0o600 });
    ok(`${path.join(AIW_DIR, '.env')} 생성 완료 (권한 600) — 실제 크리덴셜 값을 채워주세요.`);
  } else {
    info(`${path.join(AIW_DIR, '.env')} 는 이미 존재하여 건드리지 않았습니다.`);
  }

  // 5. docs — base.md(패키지 관리) + 가이드 스켈레톤(프로젝트 소유)
  await writeWithConfirm(
    path.join(root, AIW_DIR, 'docs', 'base.md'),
    renderTemplate(readTemplate(path.join('docs', 'base.md')), vars),
    { label: '공통 규칙 (패키지 관리 파일)', yes },
  );
  for (const guide of ['init-ai-guide.md', 'start-task-guide.md', 'pr-review-guide.md']) {
    await writeWithConfirm(
      path.join(root, AIW_DIR, 'docs', guide),
      renderTemplate(readTemplate(path.join('docs', guide)), vars),
      { label: '절차 가이드 스켈레톤', yes },
    );
  }

  // 6. 루트 AI.md — 진입점
  await writeWithConfirm(path.join(root, 'AI.md'), renderTemplate(readTemplate('AI.md'), vars), {
    label: '루트 진입점',
    yes,
  });

  // 7. .gitignore 센티널 블록
  const changed = syncGitignore(root, config);
  if (changed) ok('.gitignore ai-workflow 블록 적용 완료');
  else info('.gitignore ai-workflow 블록이 이미 최신입니다.');

  console.log('');
  ok('init 완료. 다음 단계:');
  console.log(`   1. ${path.join(AIW_DIR, '.env')} 에 MCP 크리덴셜을 채운다`);
  console.log('   2. aiw setup 으로 도구별 포인터/스킬 래퍼를 생성한다');
  console.log('   3. 아무 AI 도구에서 /init-ai 를 호출해 AI.md 의 PROJECT 슬롯을 채운다 (또는 직접 작성)');
  console.log('   4. aiw mcp <도구|all> 로 MCP 설정을 생성한다');
};

export const help = `사용법: aiw init [--yes] [--base-branch <브랜치>]

대상 프로젝트에 .ai-workflow/ 스캐폴드와 루트 AI.md 를 생성하고 .gitignore 블록을 적용합니다.

옵션:
  --yes, -y               기존 파일 덮어쓰기 확인을 생략 (.env 는 어떤 경우에도 덮어쓰지 않음)
  --base-branch <브랜치>  config.json 의 baseBranch 초기값 (기본: main)`;
