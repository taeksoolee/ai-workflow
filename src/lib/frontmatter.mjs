/**
 * NOTE: YAML frontmatter 파서 — 외부 의존성 금지 원칙에 따라 직접 구현한다.
 *
 * 지원 범위는 `.ai-workflow/docs/*-guide.md` 의 스킬 선언에 필요한 만큼만이다:
 *   - `키: 값` 스칼라 (따옴표 지원)
 *   - 들여쓰기(공백 2칸 단위) 기반의 중첩 맵
 *
 * 예:
 *   ---
 *   skill:
 *     name: start-task
 *     description: 새 작업을 시작할 때 사용
 *     type: command
 *   ---
 */

const stripQuotes = value => {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const parseYamlMap = lines => {
  const result = {};
  let i = 0;

  const indentOf = line => line.length - line.trimStart().length;

  const parseBlock = baseIndent => {
    const obj = {};
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) {
        i += 1;
        continue;
      }
      const indent = indentOf(line);
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        // NOTE: 예상보다 깊은 들여쓰기는 상위 키 없이 나온 것 — 무시하고 넘어간다.
        i += 1;
        continue;
      }
      const m = line.trim().match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (!m) {
        i += 1;
        continue;
      }
      const [, key, rawValue] = m;
      i += 1;
      if (rawValue === '') {
        // NOTE: 값이 비어 있으면 다음 줄의 더 깊은 들여쓰기를 중첩 맵으로 파싱한다.
        const next = lines[i];
        if (next && next.trim() && indentOf(next) > baseIndent) {
          obj[key] = parseBlock(indentOf(next));
        } else {
          obj[key] = '';
        }
      } else {
        obj[key] = stripQuotes(rawValue.trim());
      }
    }
    return obj;
  };

  Object.assign(result, parseBlock(0));
  return result;
};

/**
 * NOTE: 마크다운 문서에서 frontmatter 를 분리한다.
 * 반환: { data: object|null, body: string }
 */
export const parseFrontmatter = content => {
  const lines = content.split('\n');
  if (lines[0]?.trim() !== '---') return { data: null, body: content };

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endIndex === -1) return { data: null, body: content };

  const fmLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n');
  return { data: parseYamlMap(fmLines), body };
};
