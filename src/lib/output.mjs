/**
 * NOTE: CLI 출력 헬퍼 — 모든 사용자 안내는 한국어로 출력한다.
 * stdout 은 데이터(예: mcp 설정 JSON)와 섞이지 않도록, 진단성 메시지는
 * 필요한 곳에서 stderr(warn/error) 를 쓴다.
 */

export const info = message => console.log(`ℹ️  ${message}`);
export const ok = message => console.log(`✅ ${message}`);
export const warn = message => console.error(`⚠️  ${message}`);
export const error = message => console.error(`❌ ${message}`);
export const step = message => console.log(`▶ ${message}`);
export const skip = message => console.log(`⏭️  ${message}`);

/** NOTE: 커맨드 구현에서 "사용자 잘못(사용법 오류 등)" 을 표현하는 에러. cli.mjs 가 메시지만 출력한다. */
export class CliError extends Error {
  constructor(message, { exitCode = 1 } = {}) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}
