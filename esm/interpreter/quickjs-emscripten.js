import { fetchFiles, fetchPaths, io, stdio, writeFileShim } from './_utils.js';

const type = 'quickjs-emscripten';

const moduleLoader = (name, interpreter) => {
    return modules.get(interpreter).get(name).text;
};

const modules = new WeakMap;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '0.0.2') =>
        `https://cdn.jsdelivr.net/npm/@webreflection/quickjs-emscripten@${version}/index.js`,
    async engine({ getQuickJS }, config) {
        const QuickJS = await getQuickJS();
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(QuickJS.newContext());

        // TODO: this should not be needed if CLI flags are passed along
        const console = interpreter.newObject();
        const log = interpreter.newFunction('log', (...args) => {
            for (const value of args)
                interpreter.module.out(interpreter.dump(value));
        });
        interpreter.setProp(console, 'log', log);
        interpreter.setProp(interpreter.global, 'console', console);

        // TODO: these two are actually ignored completely
        interpreter.module.stderr = stderr;
        interpreter.module.stdout = stdout;

        interpreter.runtime.setModuleLoader(moduleLoader);
        modules.set(interpreter, new Map);
        if (config.files) await fetchFiles(this, interpreter, config.files);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        return interpreter;
    },
    registerJSModule(interpreter, name, value) {
        // TODO: wrap all module things and create a better export per field
        //       considering the `default` as special.
        //       Value also cannot be just passed to setProp as it is.
        const m = modules.get(interpreter);
        const id = `__${name}`;
        interpreter.setProp(interpreter.global, id, value);
        m.set(name, { id, value, text: `export default ${id};` });
    },
    run(interpreter, code) {
        try {
            const result = interpreter.evalCode(code, {strict: true});
            return interpreter.dump(interpreter.unwrapResult(result));
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    async runAsync(interpreter, code) {
        try {
            const result = await interpreter.evalCodeAsync(code, {strict: true});
            return interpreter.dump(interpreter.unwrapResult(result));
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runEvent(interpreter, code, event) {

    },
    transform: (_, value) => value,
    writeFile: ({ module: { FS } }, path, buffer) => writeFileShim(FS, path, buffer),
};
/* c8 ignore stop */
