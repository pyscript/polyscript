import { dirname } from "node:path";

export const python = { content: "", target: null };
export const loadMicroPython = () => ({
    registerJsModule() {

    },
    pyimport() {
        return {
            install(packages) {
                python.packages = packages;
            },
            destroy() {},
        };
    },
    runPython(content) {
        if (document.currentScript?.target) {
            python.content = content;
            python.target = document.currentScript.target;
        }
    },
    globals: {
        set(name, value) {
            globalThis[name] = value;
        },
        delete(name) {
            delete globalThis[name];
        },
    },
    FS: {
        mkdirTree() {},
        writeFile() {},
    },
    _module: {
        PATH: { dirname },
        PATH_FS: {
            resolve: (path) => path,
        },
    },
});
