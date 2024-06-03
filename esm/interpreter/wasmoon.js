import { dedent } from '../utils.js';
import { fetchFiles, fetchJSModules, fetchPaths, writeFileShim } from './_utils.js';
import { io, stdio } from './_io.js';

const type = 'wasmoon';

// MISSING:
//  * I've no idea how to import packages

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '1.16.0') =>
        `https://cdn.jsdelivr.net/npm/wasmoon@${version}/+esm`,
    async engine({ LuaFactory, LuaLibraries }, config, _, baseURL) {
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(new LuaFactory().createEngine());
        interpreter.global.getTable(LuaLibraries.Base, (index) => {
            interpreter.global.setField(index, 'print', stdout);
            interpreter.global.setField(index, 'printErr', stderr);
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields
    registerJSModule: (interpreter, name, value) => {
        interpreter.global.set(name, value);
    },
    run: (interpreter, code, ...args) => {
        try {
            return interpreter.doStringSync(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runAsync: async (interpreter, code, ...args) => {
        try {
            return await interpreter.doString(dedent(code), ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runEvent: async (interpreter, code, event) => {
        // allows method(event) as well as namespace.method(event)
        // it does not allow fancy brackets names for now
        const [name, ...keys] = code.split('.');
        let target = interpreter.global.get(name);
        let context;
        for (const key of keys) [context, target] = [target, target[key]];
        try {
            await target.call(context, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile: (
        {
            cmodule: {
                module: { FS },
            },
        },
        path,
        buffer,
    ) => writeFileShim(FS, path, buffer),
};
/* c8 ignore stop */
