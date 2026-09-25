/**
 * NOTE: `aiw mcp` — MCP 설정 생성 (tamna-frontend scripts/setup-mcp.sh + scripts/mcp/*.mjs 이식).
 *
 * `.ai-workflow/mcp.base.json` + `.ai-workflow/.env` 를 합쳐 도구별 위치·포맷으로 설정 파일을 만든다.
 *
 * 원본의 안전장치를 모두 유지한다:
 * - 치환은 JSON 파싱 후 "값 단위" 로 한다 (텍스트 치환은 토큰의 " 나 \ 가 JSON 을 깨뜨린다)
 * - `.env` 는 실행(source)하지 않고 파싱만 한다. 셸 환경변수가 파일 값보다 우선한다
 * - 값이 비어 있는 크리덴셜의 서버는 통째로 제외하고 무엇을 왜 뺐는지 보고한다
 * - MCP_NODE_BIN / MCP_NPX_BIN / MCP_UVX_BIN 실행기 절대경로 오버라이드
 * - 서버 단위 diff 요약 (크리덴셜 필드는 값 대신 "어떤 키가 바뀌었는지" 만)
 * - --dry-run / 덮어쓰기 확인(--yes) / 백업(.ai-workflow/backup/) / 원자적 교체 / 권한 600
 *
 * 사용법: aiw mcp <도구|all> [--dry-run] [--yes]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/args.mjs';
import { AIW_DIR, aiwPath, assertInitialized, loadConfig } from '../lib/config.mjs';
import { loadEnvFile } from '../lib/env.mjs';
import { atomicWrite, backupTo, ensureDir } from '../lib/fsx.mjs';
import { confirm } from '../lib/prompt.mjs';
import { getTool, resolveTools } from '../tools/index.mjs';
import { ok, info, warn, error, step, skip, CliError } from '../lib/output.mjs';

// NOTE: `${MCP_FOO_BAR}` 형태의 크리덴셜 플레이스홀더 (대문자 스네이크케이스).
const PLACEHOLDER = /\$\{([A-Z0-9_]+)\}/g;

// NOTE: base 의 실행기(command) 별로 대응하는 `.env` 절대경로 오버라이드 키.
const RUNNER_OVERRIDE_KEYS = { npx: 'MCP_NPX_BIN', uvx: 'MCP_UVX_BIN' };

// NOTE: 값이 크리덴셜인 필드 — diff 에서 변경 여부만 알리고 값은 절대 출력하지 않는다.
const SECRET_FIELDS = new Set(['env', 'environment', 'headers']);

const readEnv = name => (process.env[name] ?? '').trim();

/** NOTE: 문자열/배열/객체를 재귀적으로 훑으며 `${VAR}` 를 env 값으로 치환한다. 빈 변수는 missing 에 수집. */
const substitute = (value, missing) => {
  if (typeof value === 'string') {
    return value.replace(PLACEHOLDER, (_match, name) => {
      const resolved = readEnv(name);
      if (!resolved) {
        missing.add(name);
        return '';
      }
      return resolved;
    });
  }
  if (Array.isArray(value)) return value.map(item => substitute(item, missing));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item, missing)]));
  }
  return value;
};

const whichBin = name => {
  try {
    return execFileSync('which', [name], { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
};

/**
 * NOTE: `npx` 는 PATH 에서 찾더라도 그 shebang 이 가리키는 node 가 nvm default 와 어긋나면 실패한다.
 * 런타임에 대화형 셸을 띄우는 대신 절대경로 결정을 "생성 시점" 으로 옮기고, 필요한 사람만 `.env` 로 켠다.
 */
const applyRunnerOverride = (name, entry) => {
  const command = entry.command;
  if (!command || !(command in RUNNER_OVERRIDE_KEYS)) return entry;

  const overrideBin = readEnv(RUNNER_OVERRIDE_KEYS[command]);
  const nodeBin = readEnv('MCP_NODE_BIN');

  if (command === 'npx' && nodeBin) {
    const npxPath = overrideBin || whichBin('npx');
    if (!npxPath) {
      warn(`${name}: MCP_NODE_BIN 이 설정됐지만 npx 경로를 찾지 못했습니다 — MCP_NPX_BIN 을 지정하거나 PATH 를 확인하세요.`);
      return entry;
    }
    return { ...entry, command: nodeBin, args: [npxPath, ...(entry.args ?? [])] };
  }

  return overrideBin ? { ...entry, command: overrideBin } : entry;
};

const normalizeSlackMode = raw => {
  const mode = (raw ?? 'stdio').trim().toLowerCase();
  const aliases = {
    stdio: 'stdio',
    c: 'stdio',
    community: 'stdio',
    oauth: 'oauth',
    a: 'oauth',
    official: 'oauth',
    remote: 'oauth',
  };
  if (!(mode in aliases)) {
    warn(`알 수 없는 MCP_SLACK_MODE=${JSON.stringify(raw)} — stdio 로 진행합니다. (허용: stdio|oauth)`);
    return 'stdio';
  }
  return aliases[mode];
};

/** NOTE: base 의 mcpServers 를 완성된 서버 맵으로 만든다. */
const buildServers = (base, envFileLabel) => {
  const rawServers = base.mcpServers;
  if (!rawServers || typeof rawServers !== 'object') {
    throw new CliError(`mcp.base.json 에 mcpServers 객체가 없습니다.`);
  }

  // NOTE: slack(stdio) / slack-oauth(url) 는 모드에 맞는 쪽 하나만 남긴다 (동시 활성 시 도구 중복).
  //       base 에 slack 계열 키가 아예 없으면 이 규칙은 적용되지 않는다 (범용 패키지 — slack 은 선택).
  let slackDropped = null;
  if ('slack' in rawServers || 'slack-oauth' in rawServers) {
    const mode = normalizeSlackMode(process.env.MCP_SLACK_MODE);
    info(`Slack MCP 모드: ${mode}`);
    const slackKey = mode === 'oauth' ? 'slack-oauth' : 'slack';
    slackDropped = mode === 'oauth' ? 'slack' : 'slack-oauth';
    if (!rawServers[slackKey]) {
      throw new CliError(`${mode} 모드인데 mcp.base.json 에 ${slackKey} 엔트리가 없습니다.`);
    }
  }

  const servers = {};
  const skipped = [];

  for (const [name, entry] of Object.entries(rawServers)) {
    if (name === slackDropped) continue;

    const missing = new Set();
    const resolved = substitute(entry, missing);
    if (missing.size > 0) {
      skipped.push({ name, missing: [...missing] });
      continue;
    }
    servers[name] = applyRunnerOverride(name, resolved);
  }

  for (const { name, missing } of skipped) {
    warn(`${name} 서버 제외 — ${envFileLabel} 에 값이 비어 있습니다: ${missing.join(', ')}`);
  }
  if (Object.keys(servers).length === 0) {
    throw new CliError(`생성할 MCP 서버가 없습니다. ${envFileLabel} 값을 확인하세요.`);
  }

  info(`포함된 서버(${Object.keys(servers).length}): ${Object.keys(servers).join(', ')}`);
  return servers;
};

const toOpencodeEntry = server => {
  if ('url' in server) {
    const entry = { type: 'remote', url: server.url, enabled: true };
    if (server.headers) entry.headers = server.headers;
    return entry;
  }
  const entry = { type: 'local', command: [server.command, ...(server.args ?? [])], enabled: true };
  if (server.env) entry.environment = server.env;
  return entry;
};

const readJsonFile = (filePath, label) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    throw new CliError(`${label} 파싱 실패: ${err.message}`);
  }
};

/** NOTE: 포맷별 최종 출력 객체를 만든다. opencode 는 기존 파일 위에 mcp 키만 덮어쓴다. */
const formatOutput = (servers, format, existingPath) => {
  if (format === 'vscode') return { servers };
  if (format === 'opencode') {
    const existing = existingPath && fs.existsSync(existingPath) ? readJsonFile(existingPath, existingPath) : {};
    existing.mcp = Object.fromEntries(Object.entries(servers).map(([name, server]) => [name, toOpencodeEntry(server)]));
    existing.$schema ??= 'https://opencode.ai/config.json';
    return existing;
  }
  return { mcpServers: servers };
};

// --- diff 요약 (scripts/mcp/diff-config.mjs 이식) ---------------------------

const extractServers = parsed => parsed.mcpServers ?? parsed.servers ?? parsed.mcp ?? {};

const describeSecretChange = (before = {}, after = {}) => {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changed = keys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return changed.length > 0 ? `값 변경 (${changed.join(', ')})` : '';
};

const describeChange = (before, after) => {
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const lines = [];
  for (const field of fields) {
    if (JSON.stringify(before[field]) === JSON.stringify(after[field])) continue;
    if (SECRET_FIELDS.has(field)) {
      const summary = describeSecretChange(before[field], after[field]);
      if (summary) lines.push(`      ${field}: ${summary}`);
      continue;
    }
    lines.push(`      ${field}: ${JSON.stringify(before[field] ?? null)} → ${JSON.stringify(after[field] ?? null)}`);
  }
  return lines;
};

/** NOTE: 기존 파일과 생성 결과의 차이를 "서버 단위" 로 stderr 에 요약한다 (크리덴셜 값은 절대 출력하지 않음). */
const printDiff = (existingPath, nextOutput) => {
  let current = null;
  if (existingPath && fs.existsSync(existingPath)) {
    try {
      current = extractServers(JSON.parse(fs.readFileSync(existingPath, 'utf-8')));
    } catch {
      current = null;
    }
  }
  const next = extractServers(nextOutput) ?? {};

  if (current === null) {
    console.error('   신규 생성 (기존 파일 없음 또는 읽을 수 없음)');
    return;
  }

  const names = [...new Set([...Object.keys(current), ...Object.keys(next)])].sort();
  const lines = [];
  for (const name of names) {
    if (!(name in current)) {
      lines.push(`   + ${name} (추가)`);
      continue;
    }
    if (!(name in next)) {
      lines.push(`   - ${name} (제거)`);
      continue;
    }
    const changes = describeChange(current[name], next[name]);
    if (changes.length > 0) lines.push(`   ~ ${name} (변경)`, ...changes);
  }
  console.error(lines.length > 0 ? lines.join('\n') : '   변경 없음');
};

// --- 파일 생성 오케스트레이션 (setup-mcp.sh 의 generate 이식) ----------------

const generate = async (root, servers, { outPath, format, dryRun, yes }) => {
  const absOut = path.join(root, outPath);

  console.log('');
  step(outPath);

  const output = formatOutput(servers, format, absOut);
  const content = `${JSON.stringify(output, null, 2)}\n`;

  // NOTE: JSON.stringify 결과라 항상 유효하지만, 원본의 "쓰기 전 JSON 검증" 안전장치를 유지한다.
  try {
    JSON.parse(content);
  } catch {
    error('생성 결과가 올바른 JSON 이 아닙니다 — 기존 파일은 건드리지 않았습니다.');
    return false;
  }

  printDiff(absOut, output);

  if (dryRun) {
    console.log('🔎 --dry-run — 파일을 쓰지 않았습니다.');
    return true;
  }

  if (fs.existsSync(absOut)) {
    const existing = fs.readFileSync(absOut, 'utf-8');
    if (existing === content) {
      // NOTE: 내용이 같으면 백업·재작성 없이 그대로 둔다 (반복 실행 멱등).
      ok(`${outPath} 변경 없음 — 그대로 둡니다.`);
      return true;
    }
    const answer = await confirm('⚠️  위 변경으로 덮어쓰시겠습니까?', { yes });
    if (!answer) {
      skip('건너뜁니다.');
      return true;
    }
    // NOTE: 교체 전 원본을 .ai-workflow/backup/ 으로 백업한다 (권한 600).
    const backupPath = backupTo(absOut, aiwPath(root, 'backup'), outPath);
    if (backupPath) console.log(`🗂  백업: ${path.relative(root, backupPath)}`);
  }

  ensureDir(path.dirname(absOut));
  atomicWrite(absOut, content, { mode: 0o600 });
  ok(`${outPath} 생성 완료 (권한 600)`);
  return true;
};

export const run = async argv => {
  const { flags, positionals } = parseArgs(argv, {
    dryRun: ['--dry-run', '-n'],
    yes: ['--yes', '-y'],
  });
  const root = process.cwd();

  assertInitialized(root);
  const config = loadConfig(root);

  const target = (positionals[0] ?? '').toLowerCase();
  if (!target) {
    throw new CliError(`도구명을 입력해주세요.\n${help}`);
  }

  // NOTE: MCP 출력을 가진 도구만 대상. all 은 config.tools 중 mcpOutput 이 있는 도구 전체 (경로 dedupe).
  let targets;
  if (target === 'all') {
    targets = resolveTools(config.tools).filter(tool => tool.mcpOutput);
  } else {
    const tool = getTool(target);
    if (!tool.mcpOutput) {
      throw new CliError(`'${tool.id}' 는 MCP 설정 파일 생성을 지원하지 않는 도구입니다.`);
    }
    targets = [tool];
  }

  const basePath = aiwPath(root, 'mcp.base.json');
  const envPath = aiwPath(root, '.env');
  const envLabel = `${AIW_DIR}/.env`;

  if (!fs.existsSync(basePath)) {
    throw new CliError(`${AIW_DIR}/mcp.base.json 파일이 없습니다. 'aiw init' 을 먼저 실행하세요.`);
  }
  if (!fs.existsSync(envPath)) {
    throw new CliError(`${envLabel} 파일이 없습니다.\n💡 cp ${AIW_DIR}/.env.example ${envLabel} 후 값을 채워주세요.`);
  }

  // NOTE: 셸에 이미 있는 값이 우선한다 (CI 에서 .env 없이 주입하는 경로를 막지 않기 위함).
  loadEnvFile(envPath);

  const servers = buildServers(readJsonFile(basePath, `${AIW_DIR}/mcp.base.json`), envLabel);

  // NOTE: copilot/vscode 처럼 같은 파일을 공유하는 도구는 경로 기준으로 한 번만 생성한다.
  const seenPaths = new Set();
  let failures = 0;
  for (const tool of targets) {
    const { path: outPath, format } = tool.mcpOutput;
    if (seenPaths.has(outPath)) continue;
    seenPaths.add(outPath);
    try {
      const success = await generate(root, servers, { outPath, format, dryRun: flags.dryRun, yes: flags.yes });
      if (!success) failures += 1;
    } catch (err) {
      if (err instanceof CliError) {
        error(err.message);
        failures += 1;
      } else {
        throw err;
      }
    }
  }

  if (failures > 0) {
    console.log('');
    throw new CliError(`${failures} 개 설정 생성에 실패했습니다.`);
  }
};

export const help = `사용법: aiw mcp <도구|all> [--dry-run] [--yes]

.ai-workflow/mcp.base.json + .ai-workflow/.env 를 합쳐 도구별 MCP 설정 파일을 생성합니다.
값이 비어 있는 크리덴셜의 서버는 자동 제외되며, 생성 파일은 권한 600 으로 저장됩니다.

도구: claude, cursor, windsurf, vscode, copilot, antigravity, kiro, opencode, all

옵션:
  --dry-run, -n  파일을 쓰지 않고 변경 예정 내용만 출력
  --yes, -y      덮어쓰기 확인 없이 진행 (비대화형 실행용)`;
