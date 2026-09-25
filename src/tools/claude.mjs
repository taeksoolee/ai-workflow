/**
 * NOTE: Claude Code
 * [지원 현황] 리포지토리 안에 파일을 두면 '/이름' 형태로 호출 가능한 스킬 포맷 지원 확인됨.
 * 커맨드가 스킬로 통합됨 — 항상 .claude/skills/{key}/SKILL.md 로 생성하고,
 * command 타입은 disable-model-invocation:true 로 자동 발동을 꺼 사용자 /명령 전용으로 만든다.
 */
import { skillMd } from './shared.mjs';

export default {
  id: 'claude',
  label: 'Claude Code',
  pointerFiles: ['CLAUDE.md'],
  skillWrappers(skill) {
    const extra = skill.type === 'command' ? 'disable-model-invocation: true' : '';
    return [
      {
        path: `.claude/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill, extra),
        label: `Claude Code 스킬(${skill.type})`,
      },
    ];
  },
  mcpOutput: { path: '.mcp.json', format: 'standard' },
  gitignoreEntries: ['CLAUDE.md', '.claude/skills/', '.mcp.json'],
};
