/**
 * NOTE: `.ai-workflow/config.json` 로더 — "기본값 + 프로젝트 오버라이드" 패턴.
 * 파일이 없거나 일부 키가 빠져 있어도 기본값으로 동작한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CliError } from './output.mjs';

export const AIW_DIR = '.ai-workflow';

export const DEFAULT_CONFIG = Object.freeze({
  /** 새 브랜치의 베이스 브랜치 (origin/<baseBranch> 에서 직접 딴다) */
  baseBranch: 'main',
  /** 허용 브랜치 prefix */
  branchPrefixes: ['feature', 'fix', 'hotfix', 'release', 'chore', 'refactor', 'docs', 'test'],
  /** 커밋 포맷: "conventional" — `feat:` 등 prefix 필수, 이슈키 없음 */
  commitFormat: 'conventional',
  /** 파생 파일(포인터/래퍼/mcp 설정)을 gitignore 블록으로 관리할지 */
  ignoreDerived: true,
  /** 활성 도구 목록 (기본 전체) */
  tools: [
    'claude',
    'cursor',
    'kiro',
    'copilot',
    'opencode',
    'codex',
    'windsurf',
    'continue',
    'trae',
    'antigravity',
    'vscode',
  ],
});

export const configPath = root => path.join(root, AIW_DIR, 'config.json');

export const loadConfig = (root = process.cwd()) => {
  const filePath = configPath(root);
  if (!fs.existsSync(filePath)) return { ...DEFAULT_CONFIG };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new CliError(`${path.relative(root, filePath)} 파싱 실패: ${error.message}`);
  }
  return { ...DEFAULT_CONFIG, ...parsed };
};

export const aiwPath = (root, ...segments) => path.join(root, AIW_DIR, ...segments);

/** NOTE: `.ai-workflow/` 가 없으면 init 부터 하라고 안내한다. */
export const assertInitialized = (root = process.cwd()) => {
  if (!fs.existsSync(path.join(root, AIW_DIR))) {
    throw new CliError(`'${AIW_DIR}/' 디렉터리가 없습니다. 먼저 'aiw init' 을 실행하세요.`);
  }
};
