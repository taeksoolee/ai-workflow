/**
 * NOTE: Kiro
 * [지원 현황] 파일 기반은 skills 하나뿐 (prompts 직접 배치는 공식 미확인).
 * command/skill 두 타입 모두 스킬로 생성한다.
 */
import { skillMd } from './shared.mjs';

export default {
  id: 'kiro',
  label: 'Kiro',
  pointerFiles: ['.kiro/steering/guidelines.md'],
  skillWrappers(skill) {
    return [
      {
        path: `.kiro/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: `Kiro 스킬(${skill.type})`,
      },
    ];
  },
  mcpOutput: { path: '.kiro/settings/mcp.json', format: 'standard' },
  gitignoreEntries: ['.kiro/steering/', '.kiro/skills/', '.kiro/settings/mcp.json'],
};
