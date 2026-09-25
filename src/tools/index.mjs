/**
 * NOTE: 도구 레지스트리 집계.
 * 새 도구를 추가하려면 도구 정의 파일을 하나 만들고 여기 목록에 넣기만 하면 된다 —
 * 포인터/래퍼/MCP/gitignore 항목의 정본은 각 도구 정의가 소유한다.
 *
 * [스킬 배포 지원 현황 요약] (tamna-frontend scripts/setup-ai.sh 헤더 이식)
 * 아래 10개 도구는 리포지토리 안에 파일을 두면 실제로 '/이름'(Codex 는 '$이름')
 * 형태로 호출 가능한 커스텀 커맨드/스킬 포맷이 확인되어 지원한다:
 *   claude, cursor, kiro, antigravity, codex, copilot, opencode, windsurf, continue, trae
 * 지원하지 않아 레지스트리에서 제외한 도구:
 *   - aider  : 파일 기반 커스텀 커맨드·스킬을 모두 공식 미지원 (내장 고정 + 상시로드 규칙뿐)
 *   - void   : 파일 기반 커맨드/스킬 메커니즘 없음 (.voidrules 상시규칙만)
 *   - pearai : 커맨드가 config.json/config.ts 편집 방식이라 '파일 드롭인'이 아님
 *   - gemini : 개인용이 2026-06-18 종료되고 Antigravity CLI 로 이전 (후속인 antigravity 지원)
 * vscode 는 MCP 설정 생성 전용으로만 등록한다.
 */
import claude from './claude.mjs';
import cursor from './cursor.mjs';
import kiro from './kiro.mjs';
import copilot from './copilot.mjs';
import opencode from './opencode.mjs';
import codex from './codex.mjs';
import windsurf from './windsurf.mjs';
import continueTool from './continue.mjs';
import trae from './trae.mjs';
import antigravity from './antigravity.mjs';
import vscode from './vscode.mjs';
import { CliError } from '../lib/output.mjs';

export const TOOLS = [claude, cursor, kiro, copilot, opencode, codex, windsurf, continueTool, trae, antigravity, vscode];

export const TOOL_IDS = TOOLS.map(tool => tool.id);

export const getTool = id => {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) {
    throw new CliError(`알 수 없는 도구: ${id}\n사용 가능한 도구: ${TOOL_IDS.join(', ')}, all`);
  }
  return tool;
};

/** NOTE: config.tools 에 선언된 도구만 골라 반환한다 (없는 id 는 에러). */
export const resolveTools = ids => ids.map(getTool);
