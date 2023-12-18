import { fetchFiles, fetchJSModules, fetchPaths, stdio, writeFile } from './_utils.js';
import { registerJSModule, run, runAsync, runEvent } from './_python.js';
import mipSrc from './mip_src.py'     

const type = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '1.21.0-278') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url) {
        const { stderr, stdout, get } = stdio();
        url = url.replace(/\.m?js$/, '.wasm');
        const interpreter = await get(loadMicroPython({ stderr, stdout, url }));
        if (config.files) await fetchFiles(this, interpreter, config.files);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        if (config.js_modules) await fetchJSModules(config.js_modules);
        //Install Micropython Package
        const enc = new TextEncoder()
        this.writeFile(interpreter, './mip.py', enc.encode(mipSrc))
        if (config.packages){
            const mip = interpreter.pyimport('mip');
            config.packages.forEach(p => {
                mip.install(p);
            });
        }
        
        return interpreter;
    },
    registerJSModule,
    run,
    runAsync,
    runEvent,
    transform: (interpreter, value) => (
        value instanceof interpreter.PyProxy ?
            interpreter.PyProxy.toJs(value) :
            value
    ),
    writeFile: ({ FS, _module: { PATH, PATH_FS } }, path, buffer) =>
        writeFile({ FS, PATH, PATH_FS }, path, buffer),
};
/* c8 ignore stop */
