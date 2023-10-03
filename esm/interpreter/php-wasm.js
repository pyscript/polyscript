import { dedent } from '../utils.js';
import { io, stdio } from './_utils.js';

const type = 'php-wasm';

// TODO: almost nothing is implemented

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '0.0.3') => `https://cdn.jsdelivr.net/npm/@webreflection/php@${version}/es.js`,
    async engine({ PhpWeb }, _, url) {
        const { stderr, get } = stdio();
        const interpreter = await new Promise(resolve => {
            let timer = 0, chunks = [];
            const php = new PhpWeb({
                print: (message) => {
                    chunks.push(message);
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        document.getElementById('target').innerHTML = chunks.splice(0).join('');
                    });
                },
                printErr: (message) => {
                    if (message) stderr(message);
                },
                locateFile: () => `${url.slice(0, url.lastIndexOf('/'))}/php-web.wasm`
            });
            php.addEventListener('ready', () => {
                resolve(get(php));
            });
        });
        // TODO: to be implemented
        // if (config.files) await fetchFiles(this, interpreter, config.files);
        // if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        return interpreter;
    },
    // Fallback to globally defined module fields
    registerJSModule: () => {
        // TODO: to be implemented
    },
    run: (interpreter, code, ...args) => {
        // TODO: this is always async
        try {
            return interpreter.run(`<?php ${dedent(code)} ?>`, ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runAsync: async (interpreter, code, ...args) => {
        try {
            return await interpreter.run(`<?php ${dedent(code)} ?>`, ...args);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    runEvent: async () => {
        // TODO: to be implemented
        throw new SyntaxError('runEvent are not implemented');
    },
    transform: (_, value) => value,
    writeFile: () => {
        // TODO: to be implemented
        throw new SyntaxError('writeFile is not implemented');
    },
};
/* c8 ignore stop */
