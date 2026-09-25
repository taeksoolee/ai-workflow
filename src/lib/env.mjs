/**
 * NOTE: `.ai-workflow/.env` 파서 — 파일을 실행(source)하지 않고 KEY=VALUE 로 파싱만 한다.
 * 셸에 이미 있는 값이 우선한다 (CI 에서 .env 없이 환경변수로 주입하는 경로를 막지 않기 위함).
 * (tamna-frontend scripts/sync/utils.mjs 의 loadEnvFile 이식)
 */
import fs from 'node:fs';

export const parseEnvFile = filePath => {
  const values = {};
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    values[key] = rawValue.replace(/^['"]|['"]$/g, '').trim();
  }
  return values;
};

/** NOTE: 파일 값을 process.env 로 올린다. 이미 값이 있는 키는 건드리지 않는다(셸 우선). */
export const loadEnvFile = filePath => {
  const values = parseEnvFile(filePath);
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] !== null && process.env[key] !== undefined && process.env[key] !== '') continue;
    process.env[key] = value;
  }
  return values;
};
