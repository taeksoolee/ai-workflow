/**
 * NOTE: 배포판 테스트 — workspace 링크가 아니라 `pnpm pack` 으로 만든 tarball 을
 * 실제 소비자 프로젝트에 설치해 CLI 흐름을 검증한다.
 * workspace 테스트(smoke.mjs)가 못 잡는 패키징 누락(package.json files 에 templates/presets
 * 빠짐 등)을 잡는 것이 목적이다. prepublishOnly 가 이 테스트를 배포 게이트로 사용한다.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let workDir;
let consumerDir;

const run = (command, args, cwd) => spawnSync(command, args, { cwd, encoding: 'utf-8' });

const aiw = args =>
  run(path.join(consumerDir, 'node_modules', '.bin', 'aiw'), args, consumerDir);

before(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiw-pack-'));
  consumerDir = path.join(workDir, 'consumer');
  fs.mkdirSync(consumerDir);

  const pack = run('pnpm', ['pack', '--pack-destination', workDir], REPO_ROOT);
  assert.equal(pack.status, 0, `pnpm pack 실패:\n${pack.stderr}`);
  const tarball = fs.readdirSync(workDir).find(name => name.endsWith('.tgz'));
  assert.ok(tarball, 'tarball 이 생성되지 않았습니다.');

  fs.writeFileSync(
    path.join(consumerDir, 'package.json'),
    `${JSON.stringify({ name: 'aiw-pack-consumer', private: true }, null, 2)}\n`,
  );
  run('git', ['init', '-b', 'main'], consumerDir);

  const install = run('pnpm', ['add', '-D', path.join(workDir, tarball)], consumerDir);
  assert.equal(install.status, 0, `tarball 설치 실패:\n${install.stderr}`);
});

after(() => {
  if (workDir) fs.rmSync(workDir, { recursive: true, force: true });
});

test('설치된 패키지의 aiw 가 실행된다', () => {
  const result = aiw(['--version']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
});

test('init 이 패키지에 동봉된 템플릿으로 스캐폴드를 만든다', () => {
  const result = aiw(['init', '--yes', '--base-branch', 'main']);
  assert.equal(result.status, 0, result.stderr);
  // NOTE: templates/ 가 tarball 에 빠지면 여기서 무너진다 — 이 테스트의 존재 이유.
  for (const relPath of [
    'AI.md',
    '.ai-workflow/config.json',
    '.ai-workflow/mcp.base.json',
    '.ai-workflow/.env.example',
    '.ai-workflow/docs/base.md',
    '.ai-workflow/docs/start-task-guide.md',
  ]) {
    assert.ok(fs.existsSync(path.join(consumerDir, relPath)), `${relPath} 이(가) 없습니다.`);
  }
  const baseMd = fs.readFileSync(path.join(consumerDir, '.ai-workflow/docs/base.md'), 'utf-8');
  assert.doesNotMatch(baseMd, /\{\{[A-Z_]+\}\}/, 'base.md 에 치환되지 않은 변수가 남아 있습니다.');
});

test('setup 이 파생 파일을 생성한다', () => {
  const result = aiw(['setup', '--yes']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(consumerDir, 'CLAUDE.md')));
  assert.ok(fs.existsSync(path.join(consumerDir, '.claude/skills/start-task/SKILL.md')));
});

test('mcp 가 .env 크리덴셜로 설정을 생성한다', () => {
  fs.appendFileSync(path.join(consumerDir, '.ai-workflow/.env'), 'MCP_FIGMA_API_KEY=dummy\n');
  const result = aiw(['mcp', 'claude', '--yes']);
  assert.equal(result.status, 0, result.stderr);
  const generated = JSON.parse(fs.readFileSync(path.join(consumerDir, '.mcp.json'), 'utf-8'));
  assert.ok(generated.mcpServers['figma-developer-mcp']);
});

test('check 가 통과한다', () => {
  const result = aiw(['check']);
  assert.equal(result.status, 0, result.stderr);
});
