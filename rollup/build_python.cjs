// ⚠️ This file creates Python modules as JS TextEncoder().encode results

const { join, resolve } = require('node:path');
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');

const PYTHON_DIR = resolve(join(__dirname, '..', 'python'));
const PYTHON_JS_DIR = resolve(join(__dirname, '..', 'esm', 'python'));

const { stringify } = JSON;

for (const file of readdirSync(PYTHON_DIR)) {
    const python = stringify(
        readFileSync(join(PYTHON_DIR, file)).toString()
    );
    writeFileSync(
        join(PYTHON_JS_DIR, file.replace(/\.py$/, '.js')),
        `// ⚠️ DO NOT MODIFY - SOURCE FILE: "../../python/${file}"
export default new TextEncoder().encode(${python});`,
        Object
    );
}
