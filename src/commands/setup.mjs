/**
 * NOTE: `aiw setup` — 도구별 포인터 파일 + 스킬 래퍼 생성 (tamna-frontend scripts/setup-ai.sh 이식).
 *
 * 원본과 달라진 점:
 * - 스킬 목록을 스크립트 내 배열이 아니라 `.ai-workflow/docs/*-guide.md` 의 frontmatter
 *   (skill: {name, description, type}) 에서 스캔한다 — 가이드 문서가 곧 스킬 선언(SSoT).
 * - 포인터 파일 내용은 README 파싱 대신 루트 AI.md / base.md 를 가리키는 고정 문구다.
 * - base.md drift 검사: 패키지 템플릿의 렌더 결과와 다르면 갱신한다.
 * - .gitignore 센티널 블록도 함께 갱신한다.
 *
 * 사용법: aiw setup [도구|all] [--yes]
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from '../lib/args.mjs';
import { AIW_DIR, assertInitialized, loadConfig } from '../lib/config.mjs';
import { writeWithConfirm } from '../lib/fsx.mjs';
import { parseFrontmatter } from '../lib/frontmatter.mjs';
import { renderBaseDoc } from '../lib/template.mjs';
import { getTool, resolveTools, TOOL_IDS } from '../tools/index.mjs';
import { syncGitignore } from './gitignore.mjs';
import { ok, info, warn, step, CliError } from '../lib/output.mjs';

/** NOTE: 포인터 파일 본문 — 각 도구가 루트 AI.md(와 base.md)를 강제 참조하게 하는 고정 문구. */
const pointerContent = toolLabel =>
  [
    `# Project Mandates for ${toolLabel}`,
    '',
    `- 모든 AI 에이전트는 작업을 시작하기 전과 완료한 후, 반드시 루트의 'AI.md' 와 '${AIW_DIR}/docs/base.md' 에 정의된 프로젝트 워크플로우를 읽고 엄격히 준수해야 한다.`,
    "- 'AI.md' 의 지침은 이 프로젝트의 모든 작업에 대한 타협할 수 없는 필수 요구사항이다.",
    '',
  ].join('\n');

/**
 * NOTE: `.ai-workflow/docs/*-guide.md` 를 스캔해 frontmatter 의 skill 선언을 수집한다.
 * 반환: [{ name, description, type, guidePath }]
 */
export const scanSkills = root => {
  const docsDir = path.join(root, AIW_DIR, 'docs');
  if (!fs.existsSync(docsDir)) return [];

  const skills = [];
  for (const file of fs.readdirSync(docsDir).sort()) {
    if (!file.endsWith('-guide.md')) continue;
    const filePath = path.join(docsDir, file);
    const { data } = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
    const skill = data?.skill;
    if (!skill || typeof skill !== 'object') continue;

    const relGuide = `${AIW_DIR}/docs/${file}`;
    if (!skill.name || !skill.description) {
      warn(`${relGuide}: frontmatter 의 skill 에 name/description 이 없어 건너뜁니다.`);
      continue;
    }
    const type = skill.type === 'skill' ? 'skill' : 'command';
    if (skill.type && skill.type !== 'command' && skill.type !== 'skill') {
      warn(`${relGuide}: 알 수 없는 skill.type "${skill.type}" — command 로 처리합니다.`);
    }
    skills.push({ name: skill.name, description: skill.description, type, guidePath: relGuide });
  }
  return skills;
};

/** NOTE: base.md 를 패키지 템플릿의 렌더 결과와 비교해 drift 를 검사/갱신한다. */
const syncBaseDoc = async (root, config, { yes }) => {
  const baseDocPath = path.join(root, AIW_DIR, 'docs', 'base.md');
  const expected = renderBaseDoc(config);

  if (!fs.existsSync(baseDocPath)) {
    await writeWithConfirm(baseDocPath, expected, { label: '공통 규칙 (신규 생성)', yes });
    return;
  }
  const current = fs.readFileSync(baseDocPath, 'utf-8');
  if (current === expected) {
    info(`${AIW_DIR}/docs/base.md 최신 상태 (drift 없음)`);
    return;
  }
  warn(`${AIW_DIR}/docs/base.md 가 패키지 템플릿과 다릅니다 (drift 감지) — base.md 는 패키지 관리 파일입니다.`);
  await writeWithConfirm(baseDocPath, expected, { label: '공통 규칙 (drift 갱신)', yes });
};

export const run = async argv => {
  const { flags, positionals } = parseArgs(argv, { yes: ['--yes', '-y'] });
  const yes = flags.yes;
  const root = process.cwd();

  assertInitialized(root);
  const config = loadConfig(root);

  const target = (positionals[0] ?? 'all').toLowerCase();
  let tools;
  if (target === 'all') {
    tools = resolveTools(config.tools);
  } else {
    const tool = getTool(target);
    if (!config.tools.includes(tool.id)) {
      warn(`'${tool.id}' 는 config.json 의 tools 목록에 없지만 명시 요청이므로 진행합니다.`);
    }
    tools = [tool];
  }

  // 1. base.md drift 검사/갱신
  step('base.md drift 검사...');
  await syncBaseDoc(root, config, { yes });

  // 2. 포인터 파일 (경로 기준 dedupe — AGENTS.md 는 codex/opencode 가 공유)
  step('포인터 파일 생성...');
  const pointerSeen = new Map();
  for (const tool of tools) {
    for (const pointer of tool.pointerFiles) {
      if (pointerSeen.has(pointer)) {
        info(`${pointer} 는 ${pointerSeen.get(pointer)} 와 공유 — 건너뜁니다.`);
        continue;
      }
      pointerSeen.set(pointer, tool.label);
      await writeWithConfirm(path.join(root, pointer), pointerContent(tool.label), {
        label: `${tool.label} 용 AI.md 포인터`,
        yes,
      });
    }
  }

  // 3. 스킬 스캔 + 래퍼 생성
  step(`${AIW_DIR}/docs/*-guide.md 스킬 스캔...`);
  const skills = scanSkills(root);
  if (skills.length === 0) {
    warn('frontmatter 에 skill 이 선언된 가이드 문서가 없습니다. 스킬 래퍼 생성을 건너뜁니다.');
  } else {
    info(`스킬 ${skills.length}개 감지: ${skills.map(s => `${s.name}(${s.type})`).join(', ')}`);
    for (const tool of tools) {
      if (!tool.skillWrappers) continue;
      for (const skill of skills) {
        for (const wrapper of tool.skillWrappers(skill)) {
          await writeWithConfirm(path.join(root, wrapper.path), wrapper.content, { label: wrapper.label, yes });
        }
      }
    }
  }

  // 4. .gitignore 블록 갱신
  step('.gitignore 블록 갱신...');
  const changed = syncGitignore(root, config);
  if (changed) ok('.gitignore ai-workflow 블록을 갱신했습니다.');
  else info('.gitignore ai-workflow 블록이 이미 최신입니다.');

  console.log('');
  ok(`setup 완료 (${tools.map(t => t.id).join(', ')})`);
  console.log('   생성된 포인터/래퍼 파일은 모두 파생 산출물로 gitignore 대상입니다 — 커밋하지 마세요.');
};

export const help = `사용법: aiw setup [도구|all] [--yes]

각 AI 도구가 루트 AI.md 를 참조하는 포인터 파일과, .ai-workflow/docs/*-guide.md 의
frontmatter(skill 선언)를 스캔해 도구별 커맨드/스킬 래퍼 파일을 생성합니다.
base.md drift 검사와 .gitignore 블록 갱신도 함께 수행합니다.

도구: ${TOOL_IDS.join(', ')}, all (기본: all — config.json 의 tools 목록 기준)

옵션:
  --yes, -y   기존 파일 덮어쓰기 확인을 생략`;
