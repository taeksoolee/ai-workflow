#!/usr/bin/env node
/**
 * NOTE: `aiw` CLI 엔트리 — 커맨드 라우팅만 담당하고 구현은 src/commands/*.mjs 에 있다.
 */
import { PACKAGE_NAME, PACKAGE_VERSION } from '../src/lib/pkg.mjs';
import { CliError } from '../src/lib/output.mjs';

const COMMANDS = {
  init: () => import('../src/commands/init.mjs'),
  setup: () => import('../src/commands/setup.mjs'),
  mcp: () => import('../src/commands/mcp.mjs'),
  gitignore: () => import('../src/commands/gitignore.mjs'),
  gwt: () => import('../src/commands/gwt.mjs'),
  check: () => import('../src/commands/check.mjs'),
};

const usage = `${PACKAGE_NAME} v${PACKAGE_VERSION}

사용법: aiw <커맨드> [옵션]

커맨드:
  init       .ai-workflow/ 스캐폴드 + 루트 AI.md 생성, .gitignore 블록 적용
  setup      도구별 포인터 파일 + 스킬 래퍼 생성, base.md drift 검사, .gitignore 갱신
  mcp        도구별 MCP 설정 파일 생성 (mcp.base.json + .env 합성)
  gitignore  .gitignore 센티널 블록 관리 (--check 로 검사만)
  gwt        git 워크트리 생성 + 로컬 전용 파일 동기화 + 의존성 설치
  check      프로젝트 상태 종합 점검 (쓰기 없음)

자세한 사용법: aiw <커맨드> --help`;

const main = async () => {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(usage);
    process.exit(command ? 0 : 1);
  }
  if (command === '--version' || command === '-v') {
    console.log(PACKAGE_VERSION);
    return;
  }

  const loader = COMMANDS[command];
  if (!loader) {
    console.error(`❌ 알 수 없는 커맨드: ${command}`);
    console.error('');
    console.error(usage);
    process.exit(1);
  }

  const mod = await loader();
  if (rest.includes('--help') || rest.includes('-h')) {
    console.log(mod.help);
    return;
  }
  await mod.run(rest);
};

main().catch(err => {
  if (err instanceof CliError) {
    console.error(`❌ ${err.message}`);
    process.exit(err.exitCode);
  }
  console.error(`❌ 예기치 못한 오류: ${err?.stack ?? err}`);
  process.exit(1);
});
