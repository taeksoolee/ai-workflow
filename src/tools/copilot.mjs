/**
 * NOTE: GitHub Copilot
 * [지원 현황] 파일 드롭인 커맨드/스킬 모두 지원 확인됨.
 * command = .github/prompts/{key}.prompt.md, skill = .github/skills/{key}/SKILL.md (자동 발동)
 * MCP 설정은 VS Code 와 동일한 .vscode/mcp.json 을 쓴다 (aiw mcp 에서 경로 중복은 dedupe 된다).
 */
import { skillBody, skillMd } from './shared.mjs';

export default {
  id: 'copilot',
  label: 'GitHub Copilot',
  pointerFiles: ['.github/copilot-instructions.md'],
  skillWrappers(skill) {
    if (skill.type === 'command') {
      return [
        {
          path: `.github/prompts/${skill.name}.prompt.md`,
          content: `---\ndescription: ${skill.description}\nname: ${skill.name}\n---\n\n${skillBody(skill.guidePath)}\n`,
          label: 'GitHub Copilot 프롬프트',
        },
      ];
    }
    return [
      {
        path: `.github/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: 'GitHub Copilot 스킬',
      },
    ];
  },
  mcpOutput: { path: '.vscode/mcp.json', format: 'vscode' },
  gitignoreEntries: ['.github/copilot-instructions.md', '.github/prompts/', '.github/skills/', '.vscode/mcp.json'],
};
