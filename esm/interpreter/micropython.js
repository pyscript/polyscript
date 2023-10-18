import { fetchFiles, fetchPaths, stdio, writeFile } from './_utils.js';
import { registerJSModule, run, runAsync, runEvent } from './_python.js';

const { stringify } = JSON;
const type = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '1.20.0-297') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url) {
        const { stderr, stdout, get } = stdio();
        url = url.replace(/\.m?js$/, '.wasm');
        const interpreter = await get(loadMicroPython({ stderr, stdout, url }));
        if (config.files) await fetchFiles(this, interpreter, config.files);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        if (config.packages) {
            run(interpreter, `
                import mip
                for pkg in ${stringify(config.packages)}:
                    mip.install(pkg)
                del mip
            `);
        }
        return interpreter;
    },
    registerJSModule,
    run,
    runAsync,
    runEvent,
    transform: (_, value) => value,
    writeFile: ({ FS, _module: { PATH, PATH_FS } }, path, buffer) =>
        writeFile({ FS, PATH, PATH_FS }, path, buffer),
};
/* c8 ignore stop */
