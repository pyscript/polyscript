// ⚠️ This file creates Python modules as JS TextEncoder().encode results

const { join, resolve } = require('node:path');
const { readdirSync, writeFileSync } = require('node:fs');
const { spawnSync } = require("node:child_process");

const dedent = require('codedent');

const PYTHON_DIR = resolve(join(__dirname, '..', 'python'));
const PYTHON_JS_DIR = resolve(join(__dirname, '..', 'esm', 'python'));

const { stringify } = JSON;

for (const file of readdirSync(PYTHON_DIR)) {
    const full = join(PYTHON_DIR, file);
    let python = '';
    try {
        const {
            output: [error, result],
        } = spawnSync("pyminify", [
            "--remove-literal-statements",
            full,
        ]);
        if (error) {
            console.error(error);
            process.exit(1);
        }
        python = stringify(result.toString());
    }
    catch (error) {
        console.error(error);
        console.log(dedent(`
            \x1b[1m⚠️  is your env activated?\x1b[0m
            \x1b[2mYou need a Python env to run \x1b[0mpyminify\x1b[2m.\x1b[0m
            \x1b[2mTo do so, you can try the following:\x1b[0m
            python -m venv env
            source env/bin/activate
            pip install --upgrade pip
            pip install --ignore-requires-python python-minifier
            pip install setuptools
            \x1b[2mand you can then try \x1b[0mnpm run build\x1b[2m again.\x1b[0m
        `));
        process.exit(1);
    }
    writeFileSync(
        join(PYTHON_JS_DIR, file.replace(/\.py$/, '.js')),
        `// ⚠️ DO NOT MODIFY - SOURCE FILE: "../../python/${file}"
export default new TextEncoder().encode(${python});`,
        Object
    );
}
