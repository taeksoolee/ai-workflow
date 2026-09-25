/**
 * NOTE: 패키지 자체(@taeksoolee/ai-workflow)의 메타 정보 — 버전은 base.md 의
 * generated 헤더와 drift 검사에 쓴다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TEMPLATES_DIR = path.join(PACKAGE_ROOT, 'templates');
export const PRESETS_DIR = path.join(PACKAGE_ROOT, 'presets');

const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf-8'));

export const PACKAGE_NAME = pkg.name;
export const PACKAGE_VERSION = pkg.version;

/** NOTE: base.md 헤더에는 patch 를 뺀 `vX.Y` 만 적어, patch 릴리스마다 drift 가 나지 않게 한다. */
export const PACKAGE_VERSION_SHORT = `v${pkg.version.split('.').slice(0, 2).join('.')}`;
