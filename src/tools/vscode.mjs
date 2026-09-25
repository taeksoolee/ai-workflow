/**
 * NOTE: VS Code (MCP 전용)
 * 포인터/스킬 래퍼는 만들지 않고 .vscode/mcp.json (servers 키 포맷) 만 생성한다.
 * GitHub Copilot 과 같은 파일을 공유한다 (aiw mcp 가 경로 기준으로 dedupe).
 */
export default {
  id: 'vscode',
  label: 'VS Code',
  pointerFiles: [],
  skillWrappers: null,
  mcpOutput: { path: '.vscode/mcp.json', format: 'vscode' },
  gitignoreEntries: ['.vscode/mcp.json'],
};
