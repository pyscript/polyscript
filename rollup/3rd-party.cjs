const { copyFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const CDN = "https://cdn.jsdelivr.net/npm";

const targets = join(__dirname, "..", "esm", "3rd-party");
const node_modules = join(__dirname, "..", "node_modules");

const { devDependencies } = require(join(__dirname, "..", "package.json"));

const v = (name) => devDependencies[name].replace(/[^\d.]/g, "");

const ignoreContent = str => [
    "/* c8 ignore start */",
    str,
    "/* c8 ignore stop */",
    ""
].join('\n');

const dropSourceMap = (str) =>
    str.replace(/^\/.+? sourceMappingURL=\/.+$/m, "");

// Fetch a module via jsdelivr CDN `/+esm` orchestration
// then sanitize the resulting outcome to avoid importing
// anything via `/npm/...` through Rollup
const resolve = (name) => {
    const cdn = `${CDN}/${name}@${v(name)}/+esm`;
    console.debug("fetching", cdn);
    return fetch(cdn)
        .then((b) => b.text())
        .then((text) =>
            text.replace(
                /("|')\/npm\/(.+)?\+esm\1/g,
                // normalize `/npm/module@version/+esm` as
                // just `module` so that rollup can do the rest
                (_, quote, module) => {
                    const i = module.lastIndexOf("@");
                    return `${quote}${module.slice(0, i)}${quote}`;
                },
            ),
        );
};

// create a file rollup can then process and understand
const reBundle = (name) => Promise.resolve(`export * from "${name}";\n`);

// key/value pairs as:
//  "3rd-party/file-name.js"
//    string as content or
//    Promise<string> as resolved content
const modules = {
    // toml
    "toml.js": fetch(`${CDN}/basic-toml/index.js`).then((b) =>
        b.text(),
    ),

    // zip
    "zip.js": resolve("@zip.js/zip.js"),
};

for (const [target, source] of Object.entries(modules)) {
    if (typeof source === "string") copyFileSync(source, join(targets, target));
    else {
        source.then((text) =>
            writeFileSync(
                join(targets, target),
                ignoreContent(dropSourceMap(text)),
            ),
        );
    }
}
