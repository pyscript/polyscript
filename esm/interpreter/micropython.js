import fetch from '@webreflection/fetch';

import { createProgress, writeFile } from './_utils.js';
import { getFormat, loader, loadProgress, registerJSModule, run, runAsync, runEvent } from './_python.js';
import { stdio, buffered } from './_io.js';
import { absoluteURL, fixedRelative } from '../utils.js';
import mip from '../python/mip.js';
import { zip } from '../3rd-party.js';

import { initializeNativeFS } from './_nativefs.js';

const type = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
const mkdir = (FS, path) => {
    try {
        FS.mkdir(path);
    }
    // eslint-disable-next-line no-unused-vars
    catch (_) {
        // ignore as there's no path.exists here
    }
};

const progress = createProgress('mpy');

export default {
    type,
    module: (version = '1.26.0-preview-386') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url, baseURL) {
        const { stderr, stdout, get } = stdio({
            stderr: buffered(console.error),
            stdout: buffered(console.log),
        });
        url = url.replace(/\.m?js$/, '.wasm');
        progress('Loading MicroPython');
        const interpreter = await get(loadMicroPython({ linebuffer: false, stderr, stdout, url }));
        const py_imports = importPackages.bind(this, interpreter, baseURL);
        loader.set(interpreter, py_imports);
        await loadProgress(this, progress, interpreter, config, baseURL);
        // Install Micropython Package
        this.writeFile(interpreter, './mip.py', mip);
        if (config.packages) {
            progress('Loading packages');
            await py_imports(config.packages.map(fixedRelative, baseURL));
            progress('Loaded packages');
        }
        progress('Loaded MicroPython');
        if (!interpreter.mountNativeFS)
            interpreter.mountNativeFS = initializeNativeFS(interpreter._module);
        return interpreter;
    },
    registerJSModule,
    run,
    runAsync,
    runEvent,
    transform: (interpreter, value) => interpreter.PyProxy.toJs(value),
    writeFile: (interpreter, path, buffer, url) => {
        const { FS, _module: { PATH, PATH_FS } } = interpreter;
        const fs = { FS, PATH, PATH_FS };
        const format = getFormat(path, url);
        if (format) {
            const extractDir = path.slice(0, -1);
            if (extractDir !== './') FS.mkdir(extractDir);
            switch (format) {
                case 'whl':
                case 'zip': {
                    const blob = new Blob([buffer], { type: 'application/zip' });
                    return zip().then(async ({ BlobReader, Uint8ArrayWriter, ZipReader }) => {
                        const zipFileReader = new BlobReader(blob);
                        const zipReader = new ZipReader(zipFileReader);
                        for (const entry of await zipReader.getEntries()) {
                            const { directory, filename } = entry;
                            const name = extractDir + filename;
                            if (directory) mkdir(FS, name);
                            else {
                                mkdir(FS, PATH.dirname(name));
                                const buffer = await entry.getData(new Uint8ArrayWriter);
                                FS.writeFile(name, buffer, {
                                    canOwn: true,
                                });
                            }
                        }
                        zipReader.close();
                    });
                }
                case 'tgz':
                case 'tar.gz': {
                    const TMP = './_.tar.gz';
                    writeFile(fs, TMP, buffer);
                    interpreter.runPython(`
                        import os, gzip, tarfile
                        tar = tarfile.TarFile(fileobj=gzip.GzipFile(fileobj=open("${TMP}", "rb")))
                        for f in tar:
                            name = f"${extractDir}{f.name}"
                            if f.type == tarfile.DIRTYPE:
                                if f.name != "./":
                                    os.mkdir(name.strip("/"))
                            else:
                                dir = os.path.dirname(name)
                                if not os.path.exists(dir):
                                    os.mkdir(dir)
                                source = tar.extractfile(f)
                                with open(name, "wb") as dest:
                                    dest.write(source.read())
                                    dest.close()
                        tar.close()
                        os.remove("${TMP}")
                    `);
                    return;
                }
            }
        }
        return writeFile(fs, path, buffer);
    },
};

async function importPackages(interpreter, baseURL, packages) {
    let mip;
    for (const mpyPackage of packages) {
        if (mpyPackage.endsWith('.whl')) {
            const url = absoluteURL(mpyPackage, baseURL);
            const buffer = await fetch(url).arrayBuffer();
            await this.writeFile(interpreter, './*', buffer, url);
        }
        else {
            if (!mip) mip = interpreter.pyimport('mip');
            mip.install(mpyPackage);
        }
    }
}
/* c8 ignore stop */
