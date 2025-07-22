import { dedent } from '../utils.js';
import { fetchFiles, fetchJSModules, fetchPaths } from './_utils.js';
import { io, stdio } from './_io.js';

const type = 'webr';
const r = new WeakMap();
const fr = new FinalizationRegistry(fn => fn());

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const run = async (interpreter, code) => {
  const { shelter, destroy, io } = r.get(interpreter);
  const { output, result } = await shelter.captureR(dedent(code));
  for (const { type, data } of output) io[type](data);
  fr.register(result, destroy);
  return result;
};

export default {
    type,
    experimental: true,
    module: (version = '0.5.4') =>
        `https://cdn.jsdelivr.net/npm/webr@${version}/dist/webr.mjs`,
    async engine(module, config, _, baseURL) {
        const { get } = stdio();
        const interpreter = new module.WebR();
        await get(interpreter.init().then(() => interpreter));
        const shelter = await new interpreter.Shelter();
        r.set(interpreter, {
          module,
          shelter,
          destroy: shelter.destroy.bind(shelter),
          io: io.get(interpreter),
        });
        if (config.files) await fetchFiles(this, interpreter, config.files, baseURL);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch, baseURL);
        if (config.js_modules) await fetchJSModules(config.js_modules, baseURL);
        return interpreter;
    },
    // Fallback to globally defined module fields (i.e. $xworker)
    registerJSModule(_, name) {
        console.warn(`Experimental interpreter: module ${name} is not supported (yet)`);
        // TODO: as complex JS objects / modules are not allowed
        // it's not clear how we can bind anything or import a module
        // in a context that doesn't understand methods from JS
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
    },
    run,
    runAsync: run,
    async runEvent(interpreter, code, event) {
        // TODO: WebR cannot convert exoteric objects or any literal
        // to an easy to reason about data/frame ... that conversion
        // is reserved for the future:
        // https://docs.r-wasm.org/webr/latest/convert-js-to-r.html#constructing-r-objects-from-javascript-objects
        await interpreter.evalRVoid(`${code}(event)`, {
          env: { event: { type: [ event.type ] } }
        });
    },
    transform: (_, value) => value,
    writeFile: () => {
        // MAYBE ???
    },
};
/* c8 ignore stop */
