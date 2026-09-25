/**
 * NOTE: 대화형 확인 프롬프트 (Y/n).
 * 비대화형 환경(파이프, CI)에서는 프롬프트를 띄울 수 없으므로 --yes 를 안내하고 실패시킨다.
 * (tamna-frontend setup-mcp.sh 의 /dev/tty 처리와 같은 취지 — node 에서는 stdin TTY 여부로 판별)
 */
import readline from 'node:readline';
import { CliError } from './output.mjs';

export const confirm = async (question, { yes = false } = {}) => {
  if (yes) return true;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new CliError('확인 프롬프트를 띄울 수 없습니다. 비대화형 환경에서는 --yes 를 붙여주세요.');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise(resolve => {
      rl.question(`${question} [y/N]: `, resolve);
    });
    return /^[Yy]$/.test(answer.trim());
  } finally {
    rl.close();
  }
};
