// This file generates /core.js minified version of the module, which is
// the default exported as npm entry.

import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { string } from "rollup-plugin-string"

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

createRequire(import.meta.url)("./build_interpreters.cjs");

const WORKERS_DIR = resolve(
    join(dirname(fileURLToPath(import.meta.url)), "..", "esm", "worker"),
);

const plugins = [nodeResolve(), string({ include: "**/*.py" })];

export default {
    input: join(WORKERS_DIR, "_template.js"),
    plugins: process.env.NO_MIN ? plugins : plugins.concat(terser()),
    output: {
        esModule: true,
        file: join(WORKERS_DIR, "__template.js"),
    },
};
