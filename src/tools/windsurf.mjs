/**
 * NOTE: Windsurf
 * [지원 현황] 파일 드롭인 커맨드/스킬 모두 지원 확인됨.
 * command = .windsurf/workflows/{key}.md (수동 전용), skill = .windsurf/skills/{key}/SKILL.md (자동)
 */
import { skillBody, skillMd } from './shared.mjs';

export default {
  id: 'windsurf',
  label: 'Windsurf',
  pointerFiles: ['.windsurfrules'],
  skillWrappers(skill) {
    if (skill.type === 'command') {
      return [
        {
          path: `.windsurf/workflows/${skill.name}.md`,
          content: `---\ndescription: ${skill.description}\n---\n\n${skillBody(skill.guidePath)}\n`,
          label: 'Windsurf 워크플로우',
        },
      ];
    }
    return [
      {
        path: `.windsurf/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: 'Windsurf 스킬',
      },
    ];
  },
  mcpOutput: { path: '.windsurf/mcp.json', format: 'standard' },
  gitignoreEntries: ['.windsurfrules', '.windsurf/workflows/', '.windsurf/skills/', '.windsurf/mcp.json'],
};
