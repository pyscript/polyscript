import * as DIRECT from 'reflected-ffi/direct';
const JSON = { parse: DIRECT.decode, stringify: DIRECT.encode };

import { fetchFiles, fetchJSModules, fetchPaths } from './_utils.js';
import { IDBMapSync, dedent } from '../utils.js';
import { io } from './_io.js';

export const loader = new WeakMap();

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export const loadProgress = async (self, progress, interpreter, config, baseURL) => {
    if (config.files) {
        progress('Loading files');
        await fetchFiles(self, interpreter, config.files, baseURL);
        progress('Loaded files');
    }
    if (config.fetch) {
        progress('Loading fetch');
        await fetchPaths(self, interpreter, config.fetch, baseURL);
        progress('Loaded fetch');
    }
    if (config.js_modules) {
        progress('Loading JS modules');
        await fetchJSModules(config.js_modules, baseURL);
        progress('Loaded JS modules');
    }
};

export const registerJSModule = (interpreter, name, value) => {
    if (name === 'polyscript') {
        value.lazy_py_modules = async (...packages) => {
            await loader.get(interpreter)(packages);
            return packages.map(name => interpreter.pyimport(name));
        };
        value.storage = async (name) => {
            const storage = new IDBMapSync(name);
            await storage.sync();
            return storage;
        };
        value.JSON = JSON;
    }
    interpreter.registerJsModule(name, value);
};

export const getFormat = (path, url) => {
    if (path.endsWith('/*')) {
        if (/\.(zip|whl|tgz|tar(?:\.gz)?)$/.test(url))
            return RegExp.$1;
        throw new Error(`Unsupported archive ${url}`);
    }
    return '';
};

export const run = (interpreter, code, ...args) => {
    try {
        return interpreter.runPython(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

export const runAsync = async (interpreter, code, ...args) => {
    try {
        return await interpreter.runPythonAsync(dedent(code), ...args);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

export const runEvent = async (interpreter, code, event) => {
    // allows method(event) as well as namespace.method(event)
    // it does not allow fancy brackets names for now
    const [name, ...keys] = code.split('.');
    let target = interpreter.globals.get(name);
    let context;
    for (const key of keys) [context, target] = [target, target[key]];
    try {
        await target.call(context, event);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};
/* c8 ignore stop */
