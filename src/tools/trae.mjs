/**
 * NOTE: Trae
 * [지원 현황] 자동+수동을 Skills 하나로 커버. 두 타입 모두 .trae/skills/{key}/SKILL.md 로 생성한다.
 */
import { skillMd } from './shared.mjs';

export default {
  id: 'trae',
  label: 'Trae',
  pointerFiles: ['.traerules'],
  skillWrappers(skill) {
    return [
      {
        path: `.trae/skills/${skill.name}/SKILL.md`,
        content: skillMd(skill),
        label: `Trae 스킬(${skill.type})`,
      },
    ];
  },
  mcpOutput: null,
  gitignoreEntries: ['.traerules', '.trae/skills/'],
};
