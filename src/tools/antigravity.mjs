/**
 * NOTE: Antigravity (Gemini CLI 후속)
 * [지원 현황] 파일 드롭인 커맨드/스킬 모두 지원 확인됨.
 * command = .agent/workflows/{key}.md (워크플로우), skill = .agent/skills/{key}/SKILL.md (자동)
 * 포인터 파일은 GEMINI.md 를 그대로 읽는다.
 * (참고: 개인용 Gemini CLI 는 2026-06-18 종료·Antigravity CLI 로 이전 — 별도 gemini 도구는 두지 않는다.
 *  필요 시 .gemini/commands/*.toml 로 별도 추가 가능)
 */
import { skillBody, skillMd } from './shared.mjs';

export default {
  id: 'antigravity',
  label: 'Antigravity',
  pointerFiles: ['GEMINI.md'],
  skillWrappers(skill) {
    if (skill.type === 'command') {
      return [
        {
          path: `.agent/workflows/${skill.name}.md`,
          content: `---\ndescription: ${skill.description}\n---\n\n${skillBody(skill.guidePath)}\n`,
          label: 'Antigravity 워크플로우',
        },
      ];
    }
    return [
      {
        path: `.agent/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: 'Antigravity 스킬',
      },
    ];
  },
  mcpOutput: { path: '.agents/mcp_config.json', format: 'standard' },
  gitignoreEntries: ['GEMINI.md', '.agent/workflows/', '.agent/skills/', '.agents/mcp_config.json'],
};
