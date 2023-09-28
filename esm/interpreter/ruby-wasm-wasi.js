import { dedent } from '../utils.js';
import { fetchFiles, fetchPaths } from './_utils.js';

const type = 'ruby-wasm-wasi';
const jsType = type.replace(/\W+/g, '_');

// MISSING:
//  * there is no VFS apparently or I couldn't reach any
//  * I've no idea how to override the stderr and stdout
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    experimental: true,
    module: (version = '2.1.0') =>
        `https://cdn.jsdelivr.net/npm/ruby-3_2-wasm-wasi@${version}/dist/browser.esm.js`,
    async engine({ DefaultRubyVM }, config, url) {
        const response = await fetch(
            `${url.slice(0, url.lastIndexOf('/'))}/ruby.wasm`,
        );
        const module = await WebAssembly.compile(await response.arrayBuffer());
        const { vm: interpreter } = await DefaultRubyVM(module);
        if (config.files) await fetchFiles(this, interpreter, config.files);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(interpreter, name, value) {
        const id = `__module_${jsType}_${name}`;
        globalThis[id] = value;
        this.run(interpreter, `require "js";$${name}=JS.global[:${id}]`);
        delete globalThis[id];
    },
    run: (interpreter, code, ...args) => interpreter.eval(dedent(code), ...args),
    runAsync: (interpreter, code, ...args) => interpreter.evalAsync(dedent(code), ...args),
    async runEvent(interpreter, code, event) {
        // patch common xworker.onmessage/onerror cases
        if (/^xworker\.(on\w+)$/.test(code)) {
            const { $1: name } = RegExp;
            const id = `__module_${jsType}_event`;
            globalThis[id] = event;
            this.run(
                interpreter,
                `require "js";$xworker.call("${name}",JS.global[:${id}])`,
            );
            delete globalThis[id];
        } else {
            // Experimental: allows only events by fully qualified method name
            const method = this.run(interpreter, `method(:${code})`);
            await method.call(code, interpreter.wrap(event));
        }
    },
    transform: (_, value) => value,
    writeFile: () => {
        throw new Error(`writeFile is not supported in ${type}`);
    },
};
/* c8 ignore stop */
