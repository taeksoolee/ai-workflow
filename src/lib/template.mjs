/**
 * NOTE: 템플릿 렌더러 — `{{KEY}}` 플레이스홀더를 값으로 치환한다.
 * base.md drift 검사에서도 같은 렌더 결과를 기준으로 비교하므로, 렌더 로직은 여기 한 곳에만 둔다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { TEMPLATES_DIR, PACKAGE_NAME, PACKAGE_VERSION_SHORT } from './pkg.mjs';

export const renderTemplate = (content, vars = {}) =>
  content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => (key in vars ? String(vars[key]) : match));

export const readTemplate = relPath => fs.readFileSync(path.join(TEMPLATES_DIR, relPath), 'utf-8');

/** NOTE: config 로부터 템플릿 치환 변수를 만든다. */
export const templateVars = config => ({
  BASE_BRANCH: config.baseBranch,
  BRANCH_PREFIXES: config.branchPrefixes.map(p => `${p}/`).join(', '),
  COMMIT_FORMAT: config.commitFormat,
  PACKAGE_NAME,
  PACKAGE_VERSION: PACKAGE_VERSION_SHORT,
});

/** NOTE: base.md 는 패키지 관리 파일 — setup 의 drift 검사가 이 렌더 결과와 비교한다. */
export const renderBaseDoc = config => renderTemplate(readTemplate(path.join('docs', 'base.md')), templateVars(config));
