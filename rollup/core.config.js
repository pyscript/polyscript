// This file generates /core.js minified version of the module, which is
// the default exported as npm entry.

import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { string } from "rollup-plugin-string"

import { createRequire } from "node:module";

createRequire(import.meta.url)("./build_xworker.cjs");

const plugins = [nodeResolve(), string({ include: "**/*.py" })];

export default {
    input: "./esm/index.js",
    plugins: process.env.NO_MIN ? plugins : plugins.concat(terser()),
    output: {
        esModule: true,
        file: "./core.js",
        sourcemap: true,
    },
};
