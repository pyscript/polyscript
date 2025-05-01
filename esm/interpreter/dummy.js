import { io, stdio } from './_io.js';

const registry = new Map;

const type = 'dummy';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const require = name => registry.get(name);

const run = (interpreter, code) => {
    try {
        return Function('require', code)(require);
    }
    catch (error) {
        io.get(interpreter).stderr(error);
    }
};

export default {
    type,
    module: () => 'data:text/javascript,',
    engine: module => stdio().get(module),
    registerJSModule(_, name, value) {
        registry.set(name, value);
    },
    run,
    runAsync: run,
    runEvent: async (interpreter, code, event) => {
        try {
            await Function('require', 'e', `return ${code}(e)`)(require, event);
        }
        catch (error) {
            io.get(interpreter).stderr(error);
        }
    },
    transform: (_, value) => value,
    writeFile() {},
};
