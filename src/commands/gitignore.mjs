/**
 * NOTE: `aiw gitignore` — .gitignore 센티널 블록 관리.
 *
 * `# >>> ai-workflow >>>` ~ `# <<< ai-workflow <<<` 블록만 재생성하고 블록 밖은 불변이다.
 * 항목의 정본은 도구 레지스트리(각 도구 정의의 gitignoreEntries)다.
 *
 * `aiw gitignore`          블록을 최신 내용으로 갱신
 * `aiw gitignore --check`  블록 최신 여부 + 파생 파일 git tracked 여부 검사 (검사만, 쓰기 없음)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, AIW_DIR } from '../lib/config.mjs';
import { resolveTools } from '../tools/index.mjs';
import { atomicWrite } from '../lib/fsx.mjs';
import { parseArgs } from '../lib/args.mjs';
import { ok, info, warn, error, CliError } from '../lib/output.mjs';

export const START_MARKER = '# >>> ai-workflow >>>';
export const END_MARKER = '# <<< ai-workflow <<<';

/** NOTE: `.ai-workflow/` 내부 상태 — 도구와 무관하게 항상 무시한다. */
const INTERNAL_ENTRIES = [
  `${AIW_DIR}/.env`,
  `${AIW_DIR}/logs/`,
  `${AIW_DIR}/tmp/`,
  `${AIW_DIR}/backup/`,
];

/** NOTE: config 기준으로 블록 본문(마커 포함)을 만든다. */
export const buildBlock = config => {
  const lines = [
    START_MARKER,
    '# 이 블록은 aiw gitignore 가 자동 생성/갱신합니다. 블록 안을 직접 수정하지 마세요.',
    '# ai-workflow 내부 상태',
    ...INTERNAL_ENTRIES,
  ];

  if (config.ignoreDerived) {
    const entries = new Set();
    for (const tool of resolveTools(config.tools)) {
      for (const entry of tool.gitignoreEntries) entries.add(entry);
    }
    lines.push('# AI 도구별 파생 파일 (aiw setup / aiw mcp 생성 — 커밋하지 않음)');
    lines.push(...[...entries].sort());
  }

  lines.push(END_MARKER);
  return lines.join('\n');
};

/** NOTE: 기존 .gitignore 에서 블록을 교체(없으면 끝에 추가)한 전체 내용을 만든다. */
const applyBlock = (existing, block) => {
  const startIndex = existing.indexOf(START_MARKER);
  const endIndex = existing.indexOf(END_MARKER);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const before = existing.slice(0, startIndex);
    const after = existing.slice(endIndex + END_MARKER.length);
    return `${before}${block}${after}`;
  }
  if (startIndex !== -1 || endIndex !== -1) {
    throw new CliError('.gitignore 의 ai-workflow 블록 마커가 깨져 있습니다. 마커 줄을 정리한 후 다시 실행하세요.');
  }
  const base = existing.length > 0 && !existing.endsWith('\n') ? `${existing}\n` : existing;
  const separator = existing.trim().length > 0 ? '\n' : '';
  return `${base}${separator}${block}\n`;
};

const extractBlock = content => {
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return null;
  return content.slice(startIndex, endIndex + END_MARKER.length);
};

const isGitRepo = root => {
  try {
    execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
};

/** NOTE: 블록 항목 중 이미 git 에 추적(tracked)되고 있는 파일을 찾는다 — ignore 는 추적 중 파일에 소급 적용되지 않는다. */
const findTrackedDerived = (root, config) => {
  if (!isGitRepo(root)) return [];
  const entries = new Set(INTERNAL_ENTRIES);
  for (const tool of resolveTools(config.tools)) {
    for (const entry of tool.gitignoreEntries) entries.add(entry);
  }
  const patterns = [...entries].map(entry => (entry.endsWith('/') ? `${entry}**` : entry));
  try {
    const stdout = execFileSync('git', ['ls-files', '--', ...patterns], {
      cwd: root,
      encoding: 'utf-8',
    });
    return stdout.split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

/** NOTE: 블록을 최신 상태로 갱신한다. 반환: 변경 여부. (init / setup 이 재사용) */
export const syncGitignore = (root, config) => {
  const gitignorePath = path.join(root, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';
  const next = applyBlock(existing, buildBlock(config));
  if (next === existing) return false;
  atomicWrite(gitignorePath, next);
  return true;
};

/** NOTE: 검사 전용. 반환: 문제 목록(빈 배열이면 통과). */
export const checkGitignore = (root, config) => {
  const problems = [];
  const gitignorePath = path.join(root, '.gitignore');
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

  const currentBlock = extractBlock(existing);
  const expectedBlock = buildBlock(config);
  if (currentBlock === null) {
    problems.push('.gitignore 에 ai-workflow 블록이 없습니다. `aiw gitignore` 로 생성하세요.');
  } else if (currentBlock !== expectedBlock) {
    problems.push('.gitignore 의 ai-workflow 블록이 최신이 아닙니다. `aiw gitignore` 로 갱신하세요.');
  }

  const tracked = findTrackedDerived(root, config);
  if (tracked.length > 0) {
    problems.push(
      [
        '아래 파생/내부 파일이 git 에 추적(tracked)되고 있습니다. ignore 는 추적 중 파일에 적용되지 않으므로 추적을 해제하세요:',
        ...tracked.map(file => `  git rm --cached ${file}`),
      ].join('\n'),
    );
  }

  return problems;
};

export const run = async argv => {
  const { flags } = parseArgs(argv, { check: ['--check'] });
  const root = process.cwd();
  const config = loadConfig(root);

  if (flags.check) {
    const problems = checkGitignore(root, config);
    if (problems.length === 0) {
      ok('.gitignore ai-workflow 블록이 최신 상태이고, 추적 중인 파생 파일도 없습니다.');
      return;
    }
    for (const problem of problems) error(problem);
    throw new CliError('gitignore 검사에 실패했습니다.');
  }

  const changed = syncGitignore(root, config);
  if (changed) ok('.gitignore ai-workflow 블록을 갱신했습니다.');
  else info('.gitignore ai-workflow 블록이 이미 최신입니다.');

  const tracked = findTrackedDerived(root, config);
  if (tracked.length > 0) {
    warn('아래 파일이 여전히 git 에 추적되고 있습니다. `git rm --cached <파일>` 로 추적을 해제하세요:');
    for (const file of tracked) console.error(`   ${file}`);
  }
};

export const help = `사용법: aiw gitignore [--check]

.gitignore 의 ai-workflow 센티널 블록(# >>> ai-workflow >>> ~ # <<< ai-workflow <<<)을 관리합니다.
블록 밖 내용은 건드리지 않습니다.

옵션:
  --check   블록 최신 여부와 파생 파일의 git 추적 여부만 검사 (쓰기 없음, 실패 시 종료코드 1)`;
