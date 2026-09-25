/**
 * NOTE: `aiw gwt` — git 워크트리 생성 + 로컬 전용 파일 동기화
 * (tamna-frontend scripts/gwt.sh + scripts/sync-env.sh 이식).
 *
 * 원본과 달라진 점:
 * - 워크트리 폴더 prefix 가 리포명 하드코딩이 아니라 `git rev-parse --show-toplevel` 로 자동 유도된다.
 * - 브랜치명은 as-is 로 허용한다 (원본은 첫 하이픈을 슬래시로 강제 변환했으나,
 *   `feature-some-feature` 같은 하이픈 입력만 `feature/some-feature` 로 정규화하고
 *   슬래시 입력은 그대로 쓴다). 폴더명은 슬래시를 하이픈으로 바꾼 형태.
 * - 로컬 전용 파일 동기화 대상: 루트 `.env*` + `.ai-workflow/` 아래의 ignored 파일
 *   (git ls-files --others --ignored --exclude-standard 조회 — 새 파일이 생겨도 수정 불필요).
 * - 패키지 매니저는 락파일로 감지해 설치한다 (--no-install 로 생략).
 *
 * 사용법: aiw gwt <브랜치명> [--no-install]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/args.mjs';
import { ensureDir } from '../lib/fsx.mjs';
import { ok, info, warn, step, CliError } from '../lib/output.mjs';

const git = (args, options = {}) =>
  execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();

/** NOTE: 락파일 기반 패키지 매니저 감지. base.md 의 "락파일이 가리키는 매니저만 쓴다" 와 같은 규칙. */
const detectPackageManager = root => {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return { bin: 'pnpm', args: ['install'] };
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return { bin: 'yarn', args: ['install'] };
  if (fs.existsSync(path.join(root, 'bun.lockb')) || fs.existsSync(path.join(root, 'bun.lock'))) {
    return { bin: 'bun', args: ['install'] };
  }
  if (fs.existsSync(path.join(root, 'package-lock.json'))) return { bin: 'npm', args: ['install'] };
  return null;
};

/** NOTE: 입력을 (브랜치명, 폴더명) 쌍으로 정규화한다. */
export const resolveNames = input => {
  let branch;
  if (input.includes('/')) {
    // 'feature/some-feature' — as-is 사용 (중첩 슬래시도 그대로 허용)
    branch = input;
  } else if (input.includes('-')) {
    // 'feature-some-feature' — 첫 하이픈만 슬래시로 (원본 gwt.sh 동작 유지)
    const prefix = input.slice(0, input.indexOf('-'));
    const rest = input.slice(input.indexOf('-') + 1);
    branch = `${prefix}/${rest}`;
  } else {
    branch = input;
  }
  const folder = branch.replaceAll('/', '-');
  return { branch, folder };
};

export const run = async argv => {
  const { flags, positionals } = parseArgs(argv, { noInstall: ['--no-install'] });
  const input = positionals[0];
  if (!input) {
    throw new CliError(`워크트리 또는 브랜치 이름을 입력해주세요.\n${help}`);
  }

  let repoRoot;
  try {
    repoRoot = git(['rev-parse', '--show-toplevel'], { cwd: process.cwd() });
  } catch {
    throw new CliError('git 저장소가 아닙니다. 저장소 안에서 실행해주세요.');
  }
  const repoName = path.basename(repoRoot);

  const { branch, folder } = resolveNames(input);
  const targetDir = path.resolve(repoRoot, '..', `${repoName}-${folder}`);

  console.log('🚀 워크트리 생성을 시작합니다...');
  console.log(`📂 폴더 경로: ${targetDir}`);
  console.log(`🌿 생성 브랜치: ${branch}`);

  // 1. 디렉터리 및 브랜치 중복 확인
  if (fs.existsSync(targetDir)) {
    throw new CliError(`'${targetDir}' 폴더가 이미 존재합니다.`);
  }
  try {
    git(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { cwd: repoRoot });
    throw new CliError(`'${branch}' 브랜치가 이미 존재합니다.`);
  } catch (err) {
    if (err instanceof CliError) throw err;
    // NOTE: show-ref 실패 = 브랜치 없음 → 정상 진행
  }

  // 2. 워크트리 추가 + 새 브랜치 생성
  step('git worktree add ...');
  execFileSync('git', ['worktree', 'add', targetDir, '-b', branch], { cwd: repoRoot, stdio: 'inherit' });

  // 3. 로컬 전용 파일 동기화 — git 에 추적되지 않는(ignored) .env* / .ai-workflow 파일
  //    (git 으로 추적되는 파일은 worktree add 시 이미 체크아웃되므로 제외된다.)
  step('로컬 전용 파일 동기화 중...');
  const listOutput = git(
    ['ls-files', '--others', '--ignored', '--exclude-standard', '--', '.env*', '.ai-workflow/**'],
    { cwd: repoRoot },
  );
  const files = listOutput.split('\n').filter(Boolean)
    // NOTE: 백업·로그·스크래치는 새 워크트리로 끌고 가지 않는다.
    .filter(file => !/^\.ai-workflow\/(backup|logs|tmp)\//.test(file));

  if (files.length === 0) {
    warn('복사할 로컬 전용 파일이 없습니다.');
  } else {
    for (const file of files) {
      const src = path.join(repoRoot, file);
      const dest = path.join(targetDir, file);
      ensureDir(path.dirname(dest));
      fs.copyFileSync(src, dest);
      const stat = fs.statSync(src);
      fs.chmodSync(dest, stat.mode & 0o777); // NOTE: .env 의 600 권한 유지
      ok(`${file} → 복사 완료`);
    }
  }

  // 4. 의존성 설치 (락파일 기반 감지, --no-install 로 생략)
  if (flags.noInstall) {
    info('--no-install — 의존성 설치를 건너뜁니다.');
  } else {
    const pm = detectPackageManager(targetDir);
    if (!pm) {
      info('락파일을 찾지 못해 의존성 설치를 건너뜁니다.');
    } else {
      console.log(`📦 의존성 설치 중 (${pm.bin} ${pm.args.join(' ')})...`);
      execFileSync(pm.bin, pm.args, { cwd: targetDir, stdio: 'inherit' });
    }
  }

  console.log('✨ 모든 작업이 완료되었습니다!');
  console.log(`   cd ${targetDir}`);
};

export const help = `사용법: aiw gwt <브랜치명> [--no-install]

새 git 워크트리를 만들고 브랜치를 생성한 뒤, git 에 추적되지 않는 로컬 전용 파일
(루트 .env*, .ai-workflow/.env 등)을 복사하고 락파일 기반으로 의존성을 설치합니다.

예:
  aiw gwt feature/some-feature   # ../<리포명>-feature-some-feature 에 워크트리 생성
  aiw gwt feature-some-feature   # 동일 (첫 하이픈을 슬래시로 정규화)

옵션:
  --no-install   의존성 설치 생략`;
