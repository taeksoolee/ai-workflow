/**
 * NOTE: 파일 쓰기 공용 유틸.
 * - atomicWrite: 같은 디렉터리에 임시 파일을 쓴 뒤 rename 으로 원자적 교체 (setup-mcp.sh 이식)
 * - backupTo: 교체 전 원본을 `.ai-workflow/backup/` 으로 백업 (권한 600)
 * - writeWithConfirm: 기존 파일이 있으면 덮어쓰기 확인 (setup-ai.sh 의 write_file_with_confirm 이식)
 */
import fs from 'node:fs';
import path from 'node:path';
import { confirm } from './prompt.mjs';
import { ok, skip } from './output.mjs';

export const ensureDir = dir => {
  fs.mkdirSync(dir, { recursive: true });
};

/** NOTE: 같은 디렉터리의 임시 파일 → rename. 크래시가 나도 대상 파일이 깨진 상태로 남지 않는다. */
export const atomicWrite = (filePath, content, { mode } = {}) => {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmpPath = path.join(dir, `.aiw-tmp.${process.pid}.${Date.now()}.${path.basename(filePath)}`);
  try {
    fs.writeFileSync(tmpPath, content, mode !== undefined ? { mode } : {});
    if (mode !== undefined) fs.chmodSync(tmpPath, mode);
    fs.renameSync(tmpPath, filePath);
    // NOTE: rename 은 기존 파일 모드를 대체하므로, 모드 지정 시 최종 파일에도 한번 더 보장한다.
    if (mode !== undefined) fs.chmodSync(filePath, mode);
  } finally {
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { force: true });
  }
};

/**
 * NOTE: 원본을 백업 디렉터리로 복사한다. 파일명에 타임스탬프를 붙여 이전 백업을 덮지 않는다.
 * 반환: 백업 파일 경로 (원본이 없으면 null)
 */
export const backupTo = (filePath, backupDir, nameHint) => {
  if (!fs.existsSync(filePath)) return null;
  ensureDir(backupDir);
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
  const rawName = nameHint ?? path.basename(filePath);
  const safeName = rawName.split(/[\\/]/).filter(Boolean).join('__').replace(/^\.+(?=.)/, '');
  const backupPath = path.join(backupDir, `${safeName}.${stamp}.bak`);
  fs.copyFileSync(filePath, backupPath);
  fs.chmodSync(backupPath, 0o600);
  return backupPath;
};

/**
 * NOTE: 기존 파일이 있으면 덮어쓰기 여부를 확인한다 (--yes 로 생략 가능).
 * 반환: 실제로 썼으면 true, 사용자가 건너뛰면 false.
 */
export const writeWithConfirm = async (filePath, content, { label = '', yes = false, mode } = {}) => {
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    if (existing === content) {
      return true; // NOTE: 내용이 같으면 조용히 통과 — 반복 실행을 멱등하게 만든다.
    }
    const answer = await confirm(`⚠️  ${filePath} 가 이미 존재합니다. 덮어쓰시겠습니까?`, { yes });
    if (!answer) {
      skip(`${filePath} 생성을 건너뜁니다.`);
      return false;
    }
  }
  atomicWrite(filePath, content, { mode });
  ok(`${filePath} 동기화 완료${label ? ` (${label})` : ''}`);
  return true;
};
