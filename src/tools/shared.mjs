/**
 * NOTE: 도구 레지스트리 공용 헬퍼 — 스킬 래퍼 파일의 공통 포맷을 만든다.
 * (tamna-frontend scripts/setup-ai.sh 의 skill_body / skill_md 이식)
 *
 * 각 도구 모듈은 아래 형태의 객체를 default export 한다:
 * {
 *   id: 'claude',                       // aiw 커맨드에서 쓰는 도구 식별자
 *   label: 'Claude Code',               // 출력용 이름
 *   pointerFiles: ['CLAUDE.md'],        // AI.md 를 가리키는 포인터 파일 경로들
 *   skillWrappers(skill) => [{ path, content, label }],  // 스킬 래퍼 생성 (미지원이면 null)
 *   mcpOutput: { path, format },        // MCP 설정 출력 위치 (없으면 null)
 *   gitignoreEntries: [...],            // 이 도구의 파생 파일 gitignore 항목 (정본)
 * }
 *
 * skill 인자: { name, description, type: 'command'|'skill', guidePath }
 */

/** NOTE: 래퍼 본문 — 가이드 문서를 가리키기만 하고 절차를 중복 기술하지 않는다 (SSoT). */
export const skillBody = guidePath =>
  `\`${guidePath}\`를 읽고, 그 안의 절차를 그대로 따른다. 세부 규칙(기준, 템플릿, 커맨드, 컨벤션)은 모두 그 문서를 참조하며 이 파일에는 중복 기술하지 않는다.`;

/** NOTE: SKILL.md (frontmatter name+description + 본문). extraFrontmatter 로 추가 줄을 넘길 수 있다. */
export const skillMd = (skill, extraFrontmatter = '') => {
  const extra = extraFrontmatter ? `${extraFrontmatter}\n` : '';
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n${extra}---\n\n${skillBody(skill.guidePath)}\n`;
};
