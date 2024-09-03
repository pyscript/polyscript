// ⚠️ This file creates Python modules as JS TextEncoder().encode results

const { join, resolve } = require('node:path');
const { readdirSync, writeFileSync } = require('node:fs');
const { spawnSync } = require("node:child_process");

const PYTHON_DIR = resolve(join(__dirname, '..', 'python'));
const PYTHON_JS_DIR = resolve(join(__dirname, '..', 'esm', 'python'));

const { stringify } = JSON;

for (const file of readdirSync(PYTHON_DIR)) {
    const full = join(PYTHON_DIR, file);
    const {
        output: [error, result],
    } = spawnSync("pyminify", [
        "--remove-literal-statements",
        full,
    ]);
    if (error) process.exit(1);
    const python = stringify(result.toString());
    writeFileSync(
        join(PYTHON_JS_DIR, file.replace(/\.py$/, '.js')),
        `// ⚠️ DO NOT MODIFY - SOURCE FILE: "../../python/${file}"
export default new TextEncoder().encode(${python});`,
        Object
    );
}
