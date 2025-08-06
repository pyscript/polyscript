import { createProgress, writeFile } from './_utils.js';
import { getFormat, loader, loadProgress, registerJSModule, run, runAsync, runEvent } from './_python.js';
import { stdio } from './_io.js';
import { IDBMapSync, isArray, fixedRelative } from '../utils.js';

const type = 'pyodide';
const toJsOptions = { dict_converter: Object.fromEntries };

const { stringify } = JSON;

const { apply } = Reflect;
const FunctionPrototype = Function.prototype;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const overrideMethod = method => function (...args) {
    return apply(method, this, args);
};

let pyproxy, to_js;
const override = intercept => {

    const proxies = new WeakMap;

    const patch = args => {
        for (let arg, i = 0; i < args.length; i++) {
            switch (typeof(arg = args[i])) {
                case 'object':
                    if (arg === null) break;
                    // falls through
                case 'function': {
                    if (pyproxy in arg && !arg[pyproxy].shared?.gcRegistered) {
                        intercept = false;
                        let proxy = proxies.get(arg)?.deref();
                        if (!proxy) {
                            proxy = to_js(arg);
                            const wr = new WeakRef(proxy);
                            proxies.set(arg, wr);
                            proxies.set(proxy, wr);
                        }
                        args[i] = proxy;
                        intercept = true;
                    }
                    break;
                }
            }
        }
    };

    // the patch
    Object.defineProperties(FunctionPrototype, {
        apply: {
            value(context, args) {
                if (intercept) patch(args);
                return apply(this, context, args);
            }
        },
        call: {
            value(context, ...args) {
                if (intercept) patch(args);
                return apply(this, context, args);
            }
        }
    });
};

const progress = createProgress('py');
const indexURLs = new WeakMap();

export default {
    type,
    module: (version = '0.28.1') =>
        `https://cdn.jsdelivr.net/pyodide/v${version}/full/pyodide.mjs`,
    async engine({ loadPyodide, version }, config, url, baseURL) {
        progress('Loading Pyodide');
        let { packages, index_urls } = config;
        if (packages) packages = packages.map(fixedRelative, baseURL);
        progress('Loading Storage');
        const indexURL = url.slice(0, url.lastIndexOf('/'));
        // each pyodide version shares its own cache
        const storage = new IDBMapSync(`${indexURL}@${version}`);
        const options = { indexURL };
        // 0.28.0 has a bug where lockFileURL cannot be used directly
        // https://github.com/pyodide/pyodide/issues/5736
        const save = config.packages_cache !== 'never' && version !== '0.28.0';
        await storage.sync();
        // packages_cache = 'never' means: erase the whole DB
        if (!save) storage.clear();
        // otherwise check if cache is known
        else if (packages) {
            // packages_cache = 'passthrough' means: do not use micropip.install
            if (config.packages_cache === 'passthrough') {
                options.packages = packages;
                packages = null;
                storage.clear();
            }
            else {
                packages = packages.sort();
                // packages are uniquely stored as JSON key
                const key = stringify(packages);
                if (storage.has(key)) {
                    const value = storage.get(key);

                    // versions are not currently understood by pyodide when
                    // a lockFileURL is used instead of micropip.install(packages)
                    // https://github.com/pyodide/pyodide/issues/5135#issuecomment-2441038644
                    // https://github.com/pyscript/pyscript/issues/2245
                    options.packages = packages.map(name => name.split(/[>=<]=/)[0]);

                    if (version.startsWith('0.27')) {
                        const blob = new Blob([value], { type: 'application/json' });
                        options.lockFileURL = URL.createObjectURL(blob);
                    }
                    else {
                      options.lockFileContents = value;
                    }

                    packages = null;
                }
            }
        }
        progress('Loaded Storage');
        const { stderr, stdout, get } = stdio();
        const interpreter = await get(
            loadPyodide({ stderr, stdout, ...options }),
        );
        if (config.debug) interpreter.setDebug(true);
        const py_imports = importPackages.bind(interpreter);
        if (index_urls) indexURLs.set(interpreter, index_urls);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress, interpreter, config, baseURL);
        // if cache wasn't know, import and freeze it for the next time
        if (packages) await py_imports(packages, storage, save);
        await storage.close();
        if (options.lockFileURL) URL.revokeObjectURL(options.lockFileURL);
        progress('Loaded Pyodide');
        if (config.experimental_create_proxy === 'auto') {
            interpreter.runPython([
                'import js',
                'from pyodide.ffi import to_js',
                'o=js.Object.fromEntries',
                'js.experimental_create_proxy=lambda r:to_js(r,dict_converter=o)'
            ].join(';'), { globals: interpreter.toPy({}) });
            to_js = globalThis.experimental_create_proxy;
            delete globalThis.experimental_create_proxy;
            [pyproxy] = Reflect.ownKeys(to_js).filter(
                k => (
                    typeof k === 'symbol' &&
                    String(k) === 'Symbol(pyproxy.attrs)'
                )
            );
            override(true);
        }
        return interpreter;
    },
    registerJSModule,
    run: overrideMethod(run),
    runAsync: overrideMethod(runAsync),
    runEvent: overrideMethod(runEvent),
    transform: (interpreter, value) => apply(transform, interpreter, [value]),
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
    if (indexURLs.has(this)) micropip.set_index_urls(indexURLs.get(this));
    await micropip.install(packages, { keep_going: true });
    console.log = log;
    if (save && (storage instanceof IDBMapSync)) {
        const frozen = micropip.freeze();
        storage.set(stringify(packages), frozen);
    }
    micropip.destroy();
}
/* c8 ignore stop */
