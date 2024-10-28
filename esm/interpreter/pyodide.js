import { create } from 'gc-hook';

import { RUNNING_IN_WORKER, createProgress, writeFile } from './_utils.js';
import { getFormat, loader, loadProgress, registerJSModule, run, runAsync, runEvent } from './_python.js';
import { stdio } from './_io.js';
import { IDBMapSync, isArray } from '../utils.js';

const type = 'pyodide';
const toJsOptions = { dict_converter: Object.fromEntries };

const { stringify } = JSON;

// REQUIRES INTEGRATION TEST
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

const progress = createProgress('py');

export default {
    type,
    module: (version = '0.26.3') =>
        `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    async engine({ loadPyodide }, config, url, baseURL) {
        // apply override ASAP then load foreign code
        if (!RUNNING_IN_WORKER && config.experimental_create_proxy === 'auto')
            applyOverride();
        progress('Loading Pyodide');
        let { packages } = config;
        progress('Loading Storage');
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        // each pyodide version shares its own cache
        const storage = new IDBMapSync(indexURL);
        const options = { indexURL };
        const save = config.packages_cache !== 'never';
        await storage.sync();
        // packages_cache = 'never' means: erase the whole DB
        if (!save) storage.clear();
        // otherwise check if cache is known
        else if (packages) {
            packages = packages.slice(0).sort();
            // packages are uniquely stored as JSON key
            const key = stringify(packages);
            if (storage.has(key)) {
                const blob = new Blob(
                    [storage.get(key)],
                    { type: 'application/json' },
                );
                // this should be used to bootstrap loadPyodide
                options.lockFileURL = URL.createObjectURL(blob);
                // versions are not currently understood by pyodide when
                // a lockFileURL is used instead of micropip.install(packages)
                // https://github.com/pyodide/pyodide/issues/5135#issuecomment-2441038644
                options.packages = packages.map(name => name.split('==')[0]);
                packages = null;
            }
        }
        progress('Loaded Storage');
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(
            loadPyodide({ stderr, stdout, ...options }),
        );
        const py_imports = importPackages.bind(interpreter);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress, interpreter, config, baseURL);
        // if cache wasn't know, import and freeze it for the next time
        if (packages) await py_imports(packages, storage, save);
        await storage.close();
        if (options.lockFileURL) URL.revokeObjectURL(options.lockFileURL);
        progress('Loaded Pyodide');
        return interpreter;
    },
    registerJSModule,
    run: overrideMethod(run),
    runAsync: overrideMethod(runAsync),
    runEvent: overrideMethod(runEvent),
    transform: (interpreter, value) => transform.call(interpreter, value),
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

function transform(value) {
    const { ffi: { PyProxy } } = this;
    if (value && typeof value === 'object') {
        if (value instanceof PyProxy) return value.toJs(toJsOptions);
        // I believe this case is for LiteralMap which is not a PyProxy
        // and yet it needs to be re-converted to something useful.
        if (value instanceof Map) return new Map([...value.entries()]);
        if (isArray(value)) return value.map(transform, this);
    }
    return value;
}

// exposed utility to import packages via polyscript.lazy_py_modules
async function importPackages(packages, storage, save = false) {
    // temporary patch/fix console.log which is used
    // not only by Pyodide but by micropip too and there's
    // no way to intercept those calls otherwise
    const { log } = console;
    const _log = (detail, ...rest) => {
        log(detail, ...rest);
        console.log = log;
        progress(detail);
        console.log = _log;
    };
    console.log = _log;
    await this.loadPackage('micropip');
    const micropip = this.pyimport('micropip');
    await micropip.install(packages, { keep_going: true });
    console.log = log;
    if (save && (storage instanceof IDBMapSync)) {
        const frozen = micropip.freeze();
        storage.set(stringify(packages), frozen);
    }
    micropip.destroy();
}
/* c8 ignore stop */
