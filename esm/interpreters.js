// ⚠️ Part of this file is automatically generated
//    The :RUNTIMES comment is a delimiter and no code should be written/changed after
//    See rollup/build_interpreters.cjs to know more

import { base } from './interpreter/_utils.js';

/** @type {Map<string, object>} */
export const registry = new Map();

/** @type {Map<string, object>} */
export const configs = new Map();

/** @type {string[]} */
export const selectors = [];

/** @type {string[]} */
export const prefixes = [];

export const interpreter = new Proxy(new Map(), {
    get(map, id) {
        if (!map.has(id)) {
            const [type, ...rest] = id.split('@');
            const interpreter = registry.get(type);
            const url = /^(?:\.?\.?\/|https?:\/\/)/i.test(rest) 
                ? rest.join('@')
                : interpreter.module(...rest);
            map.set(id, {
                url,
                module: import(/* webpackIgnore: true */url),
                engine: interpreter.engine.bind(interpreter),
            });
        }
        const { url, module, engine } = map.get(id);
        return (config, baseURL) =>
            module.then((module) => {
                configs.set(id, config);
                for (const entry of ['files', 'fetch']) {
                    const value = config?.[entry];
                    if (value) base.set(value, baseURL);
                }
                return engine(module, config, url);
            });
    },
});

const register = (interpreter) => {
    for (const type of [].concat(interpreter.type)) {
        registry.set(type, interpreter);
        selectors.push(`script[type="${type}"]`);
        prefixes.push(`${type}-`);
    }
};

//:RUNTIMES
import micropython from './interpreter/micropython.js';
import pyodide from './interpreter/pyodide.js';
import ruby_wasm_wasi from './interpreter/ruby-wasm-wasi.js';
import wasmoon from './interpreter/wasmoon.js';
for (const interpreter of [micropython, pyodide, ruby_wasm_wasi, wasmoon])
    register(interpreter);
