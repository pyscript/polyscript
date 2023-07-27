const { join, resolve } = require('node:path');
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');

const INTERPRETERS_DIR = resolve(join(__dirname, '..', 'esm', 'interpreter'));
const VERSIONS_DIR = resolve(join(__dirname, '..', 'versions'));
const IMPORT_MAP = resolve(join(__dirname, '..', 'node.importmap'));
const MAIN_TEST = resolve(join(__dirname, '..', 'test', 'index.js'));

let import_map = readFileSync(IMPORT_MAP).toString();

for (const interpreter of readdirSync(VERSIONS_DIR)) {
    const path = join(VERSIONS_DIR, interpreter);
    const version = readFileSync(path).toString().trim();
    const target = join(INTERPRETERS_DIR, `${interpreter}.js`);
    // update the default version to use within the interpreter
    writeFileSync(
        target,
        readFileSync(target).toString().replace(
            /(\bversion\b\s*=\s*)(['"]).+?\2/,
            `$1$2${version}$2`
        )
    );
    switch (interpreter) {
        case 'pyodide': {
            // update the coverage test for the version attribute
            writeFileSync(
                MAIN_TEST,
                readFileSync(MAIN_TEST).toString().replace(
                    /type="pyodide" version=".+?"/,
                    `type="pyodide" version="${version}"`
                )
            );
            // also update the import map for NodeJS
            import_map = import_map.replace(
                /cdn\.jsdelivr\.net\/pyodide\/v([^/]+?)\/full\/pyodide\.mjs/,
                `cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`
            );
            break;
        }
        case 'micropython': {
            // update the import map for NodeJS
            import_map = import_map.replace(
                /micropython-webassembly-pyscript@[^/]+?\/micropython.mjs/,
                `micropython-webassembly-pyscript@${version}/micropython.mjs`
            );
            break;
        }
  }
}

// finalize changes on import map
writeFileSync(IMPORT_MAP, import_map);
