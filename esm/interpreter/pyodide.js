import { create } from 'gc-hook';

import { RUNNING_IN_WORKER, fetchFiles, fetchJSModules, fetchPaths, writeFile } from './_utils.js';
import { getFormat, loader, registerJSModule, run, runAsync, runEvent } from './_python.js';
import { stdio } from './_io.js';

const type = 'pyodide';
const toJsOptions = { dict_converter: Object.fromEntries };

/* c8 ignore start */
let overrideFunction = false;
const overrideMethod = method => (...args) => {
    try {
        overrideFunction = true;
        return method(...args);
    }
    finally {
        overrideFunction = false;
    }
};

let overridden = false;
const applyOverride = () => {
    if (overridden) return;
    overridden = true;

    const proxies = new WeakMap;
    const onGC = value => value.destroy();
    const patchArgs = args => {
        for (let i = 0; i < args.length; i++) {
            const value = args[i];
            if (
                typeof value === 'function' &&
                'copy' in value
            ) {
                // avoid seppuku / Harakiri + speed up
                overrideFunction = false;
                // reuse copied value if known already
                let proxy = proxies.get(value)?.deref();
                if (!proxy) {
                    try {
                        // observe the copy and return a Proxy reference
                        proxy = create(value.copy(), onGC);
                        proxies.set(value, new WeakRef(proxy));
                    }
                    catch (error) {
                        console.error(error);
                    }
                }
                if (proxy) args[i] = proxy;
                overrideFunction = true;
            }
        }
    };

    // trap apply to make call possible after the patch
    const { call } = Function;
    const apply = call.bind(call, call.apply);
    // the patch
    Object.defineProperties(Function.prototype, {
        apply: {
            value(context, args) {
                if (overrideFunction) patchArgs(args);
                return apply(this, context, args);
            }
        },
        call: {
            value(context, ...args) {
                if (overrideFunction) patchArgs(args);
                return apply(this, context, args);
            }
        }
    });
};
/* c8 ignore stop */

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '0.26.1') =>
        `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    async engine({ loadPyodide }, config, url, baseURL) {
        // apply override ASAP then load foreign code
        if (!RUNNING_IN_WORKER && config.experimental_create_proxy === 'auto')
            applyOverride();
        const { stderr, stdout, get } = stdio();
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        const interpreter = await get(
            loadPyodide({ stderr, stdout, indexURL }),
        );
        const py_imports = importPackages.bind(interpreter);
        loader.set(interpreter, py_imports);
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        if (config.packages) await py_imports(config.packages);
        return interpreter;
    },
    registerJSModule,
    run: overrideMethod(run),
    runAsync: overrideMethod(runAsync),
    runEvent: overrideMethod(runEvent),
    transform: ({ ffi: { PyProxy } }, value) => (
        value instanceof PyProxy ?
            value.toJs(toJsOptions) :
            value
    ),
    writeFile: (interpreter, path, buffer, url) => {
        const format = getFormat(path, url);
        if (format) {
            return interpreter.unpackArchive(buffer, format, {
                extractDir: path.slice(0, -1)
            });
        }
        const { FS, PATH, _module: { PATH_FS } } = interpreter;
        return writeFile({ FS, PATH, PATH_FS }, path, buffer);
    },
};

// exposed utility to import packages via polyscript.lazy_py_modules
async function importPackages(packages) {
    await this.loadPackage('micropip');
    const micropip = this.pyimport('micropip');
    await micropip.install(packages, { keep_going: true });
    micropip.destroy();
}
/* c8 ignore stop */
