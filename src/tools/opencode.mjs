/**
 * NOTE: OpenCode
 * [지원 현황] 파일 드롭인 커맨드/스킬 모두 지원 확인됨.
 * command = .opencode/command/{key}.md, skill = .opencode/skills/{key}/SKILL.md (자동, skill 툴로 로드)
 * MCP 는 opencode.json 의 mcp 키로 병합 출력한다 (provider 등 기존 설정 보존 — format: opencode).
 * 포인터 파일 AGENTS.md 는 codex 와 공유한다 (aiw setup 이 경로 기준으로 dedupe).
 */
import { skillBody, skillMd } from './shared.mjs';

export default {
  id: 'opencode',
  label: 'OpenCode',
  pointerFiles: ['AGENTS.md'],
  skillWrappers(skill) {
    if (skill.type === 'command') {
      return [
        {
          path: `.opencode/command/${skill.name}.md`,
          content: `---\ndescription: ${skill.description}\n---\n\n${skillBody(skill.guidePath)}\n`,
          label: 'OpenCode 커맨드',
        },
      ];
    }
    return [
      {
        path: `.opencode/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: 'OpenCode 스킬',
      },
    ];
  },
  mcpOutput: { path: 'opencode.json', format: 'opencode' },
  gitignoreEntries: ['AGENTS.md', '.opencode/command/', '.opencode/skills/', 'opencode.json'],
};
