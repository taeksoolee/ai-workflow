/**
 * NOTE: `aiw check` — 프로젝트의 ai-workflow 상태 종합 점검 (검사만, 쓰기 없음).
 *
 * 1. .ai-workflow/ 필수 파일 존재 여부 (config.json, mcp.base.json, docs/base.md, 루트 AI.md)
 * 2. base.md drift (패키지 템플릿 렌더 결과와 비교)
 * 3. .gitignore 블록 최신 여부 + 파생 파일 git 추적 여부
 *
 * 문제가 하나라도 있으면 종료코드 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AIW_DIR, aiwPath, loadConfig } from '../lib/config.mjs';
import { renderBaseDoc } from '../lib/template.mjs';
import { checkGitignore } from './gitignore.mjs';
import { ok, error, CliError } from '../lib/output.mjs';

export const run = async () => {
  const root = process.cwd();
  const problems = [];

  // 1. 필수 파일
  const required = [
    aiwPath(root, 'config.json'),
    aiwPath(root, 'mcp.base.json'),
    aiwPath(root, 'docs', 'base.md'),
    path.join(root, 'AI.md'),
  ];
  for (const filePath of required) {
    if (!fs.existsSync(filePath)) {
      problems.push(`${path.relative(root, filePath)} 파일이 없습니다. 'aiw init' 을 실행하세요.`);
    }
  }

  const config = loadConfig(root);

  // 2. base.md drift
  const baseDocPath = aiwPath(root, 'docs', 'base.md');
  if (fs.existsSync(baseDocPath)) {
    const current = fs.readFileSync(baseDocPath, 'utf-8');
    if (current !== renderBaseDoc(config)) {
      problems.push(`${AIW_DIR}/docs/base.md 가 패키지 템플릿과 다릅니다 (drift). 'aiw setup' 으로 갱신하세요.`);
    }
  }

  // 3. gitignore
  problems.push(...checkGitignore(root, config));

  if (problems.length === 0) {
    ok('모든 검사를 통과했습니다.');
    return;
  }
  for (const problem of problems) error(problem);
  throw new CliError(`${problems.length}개 문제가 발견되었습니다.`);
};

export const help = `사용법: aiw check

.ai-workflow 필수 파일 존재, base.md drift, .gitignore 블록 상태를 검사합니다 (쓰기 없음).
문제가 있으면 종료코드 1 로 끝납니다.`;
