import { fetchFiles, fetchJSModules, fetchPaths, writeFileShim } from './_utils.js';
import { registerJSModule, run, runAsync, runEvent } from './_python.js';
import { stdio } from './_io.js';
import mip from '../python/mip.js';

const type = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '1.22.0-269') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url) {
        const { stderr, stdout, get } = stdio();
        url = url.replace(/\.m?js$/, '.wasm');
        const interpreter = await get(loadMicroPython({ stderr, stdout, url }));
        if (config.files) await fetchFiles(this, interpreter, config.files);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        if (config.js_modules) await fetchJSModules(config.js_modules);

        // Install Micropython Package
        this.writeFile(interpreter, './mip.py', mip);
        if (config.packages){
            const mpyPackageManager = interpreter.pyimport('mip');
            for (const mpyPackage of config.packages)
                mpyPackageManager.install(mpyPackage);
        }
        return interpreter;
    },
    registerJSModule,
    run,
    runAsync,
    runEvent,
    transform: (interpreter, value) => interpreter.PyProxy.toJs(value),
    writeFile: ({ FS }, path, buffer) =>
        writeFileShim(FS, path, buffer),
};
/* c8 ignore stop */
