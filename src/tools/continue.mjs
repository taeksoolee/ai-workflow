/**
 * NOTE: Continue
 * [지원 현황] 파일 드롭인은 .continue/prompts/{key}.prompt (사용자 /명령) 하나뿐.
 * 자동발동 스킬 파일은 없으므로 두 타입 모두 prompt 로 생성한다
 * (파일명=커맨드명, frontmatter 불필요 — 본문이 프롬프트).
 */
import { skillBody } from './shared.mjs';

export default {
  id: 'continue',
  label: 'Continue',
  pointerFiles: ['.continue/rules/guidelines.md'],
  skillWrappers(skill) {
    return [
      {
        path: `.continue/prompts/${skill.name}.prompt`,
        content: `${skill.description}\n\n${skillBody(skill.guidePath)}\n`,
        label: `Continue 프롬프트(${skill.type})`,
      },
    ];
  },
  mcpOutput: null,
  gitignoreEntries: ['.continue/rules/', '.continue/prompts/'],
};
