import { absoluteURL, defineProperties, defineProperty, entries, isCSS, js_modules } from '../utils.js';
import { base } from '../interpreter/_utils.js';

export default (window, sync, mainModules) => {
    const JSModules = {};
    const descriptors = {};
    const known = new Set;
    const ops = new Map;
    for (const [name, value] of globalThis[js_modules]) {
        known.add(name);
        descriptors[name] = { value };
    }
    // define lazy main modules resolution
    if (mainModules) {
        for (let [source, module] of entries(mainModules)) {
            // ignore modules already defined in worker
            if (known.has(module)) continue;
            let sources = ops.get(module);
            if (!sources) ops.set(module, (sources = []));
            sources.push(source);
        }
        for (const [name, sources] of ops) {
            descriptors[name] = {
                configurable: true,
                get() {
                    let value;
                    for (let source of sources) {
                        source = absoluteURL(source, base.get(mainModules));
                        if (isCSS(source)) sync.importCSS(source);
                        else {
                            sync.importJS(source, name);
                            value = window[js_modules].get(name);
                        }
                    }
                    // override the getter and make it no more configurable
                    defineProperty(JSModules, name, { configurable: false, get: () => value });
                    return value;
                }
            };
        }
    }
    return defineProperties(JSModules, descriptors);
};
