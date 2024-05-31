import { absoluteURL, entries, isArray, isCSS, js_modules } from '../utils.js';

const has = (modules, name) => modules.has(name);

const ownKeys = modules => [...modules.keys()];

const proxy = (modules, window, sync, baseURL) => new Proxy(modules, {
    has,
    ownKeys,
    get: (modules, name) => {
        let value = modules.get(name);
        if (isArray(value)) {
            let sources = value;
            value = null;
            for (let source of sources) {
                source = absoluteURL(source, baseURL);
                if (isCSS(source)) sync.importCSS(source);
                else {
                    sync.importJS(source, name);
                    value = window[js_modules].get(name);
                }
            }
            modules.set(name, value);
        }
        return value;
    },
});

export default (window, sync, mainModules, baseURL) => {
    const modules = globalThis[js_modules];
    if (mainModules) {
        for (let [source, module] of entries(mainModules)) {
            let value = modules.get(module);
            if (!value || isArray(value)) {
                modules.set(module, value || (value = []));
                value.push(source);
            }
        }
    }
    return proxy(modules, window, sync, baseURL);
};
