/**
 * NOTE: Codex
 * [지원 현황] 리포지토리 내 파일 기반은 skills 하나뿐 (prompts 는 deprecated·홈 경로).
 * command/skill 두 타입 모두 스킬로 생성한다.
 * 호출은 슬래시가 아니라 `$이름` 멘션이라 본문에 안내를 덧붙인다.
 */
import { skillBody } from './shared.mjs';

export default {
  id: 'codex',
  label: 'Codex',
  pointerFiles: ['AGENTS.md'],
  skillWrappers(skill) {
    const mention = `$${skill.name}`;
    const content = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skillBody(skill.guidePath)}\n\n(Codex에서는 슬래시가 아니라 ${mention} 처럼 멘션해서 명시 호출한다.)\n`;
    return [
      {
        path: `.agents/skills/${skill.name}/SKILL.md`,
        content,
        label: `Codex 스킬(${skill.type})`,
      },
    ];
  },
  mcpOutput: null,
  gitignoreEntries: ['AGENTS.md', '.agents/skills/'],
};
