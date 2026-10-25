import { compile, loadSource, packageVersion, report } from './lib.ts';

const source = loadSource();
const { problems } = compile(source, packageVersion());
const ok = report(problems);
console.log(`${source.icons.length} icons across ${Object.keys(source.libraries).length} libraries`);
process.exit(ok ? 0 : 1);
