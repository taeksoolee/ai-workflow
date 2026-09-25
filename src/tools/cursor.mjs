/**
 * NOTE: Cursor
 * [지원 현황] 파일 드롭인 커맨드/스킬 모두 지원 확인됨.
 * command = .cursor/commands/{key}.md (순수 md), skill = .cursor/skills/{key}/SKILL.md (자동 발동)
 */
import { skillBody, skillMd } from './shared.mjs';

export default {
  id: 'cursor',
  label: 'Cursor',
  pointerFiles: ['.cursorrules'],
  skillWrappers(skill) {
    if (skill.type === 'command') {
      return [
        {
          path: `.cursor/commands/${skill.name}.md`,
          content: `${skill.description}\n\n## 실행\n${skillBody(skill.guidePath)}\n`,
          label: 'Cursor 커맨드',
        },
      ];
    }
    return [
      {
        path: `.cursor/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: 'Cursor 스킬',
      },
    ];
  },
  mcpOutput: { path: '.cursor/mcp.json', format: 'standard' },
  gitignoreEntries: ['.cursorrules', '.cursor/commands/', '.cursor/skills/', '.cursor/mcp.json'],
};
