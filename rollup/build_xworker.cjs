// ⚠️ This files creates esm/worker/xworker.js in a way that it can be loaded
//    through a Blob and as a string, allowing Workers to run within any page.
//    This still needs special CSP care when CSP rules are applied to the page
//    and this file is also creating a unique sha256 version of that very same
//    text content to allow CSP rules to play nicely with it.

const { join, resolve } = require("node:path");
const { readdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { createHash } = require("node:crypto");

const DIST_DIR = resolve(join(__dirname, "..", "dist"));
const WORKERS_DIR = resolve(join(__dirname, "..", "esm", "worker"));
const PACKAGE_JSON = resolve(join(__dirname, "..", "package.json"));

const coincident = [
    "import coincident from 'coincident/window/main';",
    "const js_modules = Symbol.for('polyscript.js_modules');",
    "let transform;",
    'const { Worker } = coincident({ transfer: false, transform: value => (transform || (transform = globalThis[js_modules]?.get("-T-")))?.(value) ?? value });',
];

for (const file of readdirSync(DIST_DIR)) {
    if (file.startsWith("_")) {
        if (process.env.NO_MIN) {
            writeFileSync(
                join(WORKERS_DIR, "xworker.js"),
                [
                    '/* c8 ignore start */',
                    ...coincident,
                    `export default (...args) => new Worker('/dist/_template.js', ...args);`,
                    '/* c8 ignore stop */',
                    ''
                ].join("\n")
            );
        } else {
            const js = JSON.stringify(
                readFileSync(join(DIST_DIR, file)).toString(),
            );
            const hash = createHash("sha256");
            hash.update(js);
            const json = require(PACKAGE_JSON);
            json.worker = { blob: "sha256-" + hash.digest("base64") };
            writeFileSync(
                PACKAGE_JSON,
                JSON.stringify(json, null, "    ") + "\n",
            );
            writeFileSync(
                join(WORKERS_DIR, "xworker.js"),
                // this normalizes artifact paths otherwise not reachable via the blob
                [
                    '/* c8 ignore start */',
                    'const {url} = import.meta;',
                    `const re = ${/import\((['"])([^)]+?\.js)\1\)/}g;`,
                    `const place = ${(_,q,f) => `import(${q}${new URL(f,url).href}${q})`};`,
                    ...coincident,
                    `export default (...args) => new Worker(URL.createObjectURL(new Blob(['/*@*/'+${js}.replace(re,place)],{type:'text/javascript'})), ...args)`,
                    '/* c8 ignore stop */',
                    ''
                ].join("\n")
            );
            rmSync(join(DIST_DIR, file));
        }
    }
}
