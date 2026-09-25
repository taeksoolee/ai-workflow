/**
 * NOTE: 초소형 인자 파서 — 외부 의존성 없이 커맨드별 플래그를 처리한다.
 *
 * parseArgs(argv, spec)
 *   spec: { flagName: ['--long', '-short'], valueName: { flags: ['--opt'], value: true } }
 *   반환: { flags: { flagName: boolean, valueName: string|undefined }, positionals: string[] }
 */
import { CliError } from './output.mjs';

export const parseArgs = (argv, spec = {}) => {
  const flags = {};
  const positionals = [];
  const lookup = new Map();

  for (const [name, def] of Object.entries(spec)) {
    const aliases = Array.isArray(def) ? def : def.flags;
    const takesValue = !Array.isArray(def) && Boolean(def.value);
    for (const alias of aliases) lookup.set(alias, { name, takesValue });
    flags[name] = takesValue ? undefined : false;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('-')) {
      const entry = lookup.get(arg);
      if (!entry) throw new CliError(`알 수 없는 옵션: ${arg}`);
      if (entry.takesValue) {
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('-')) {
          throw new CliError(`${arg} 옵션에는 값이 필요합니다.`);
        }
        flags[entry.name] = value;
        i += 1;
      } else {
        flags[entry.name] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals };
};
