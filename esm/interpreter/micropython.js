// import fetch from '@webreflection/fetch';
import { fetchFiles, fetchJSModules, fetchPaths, writeFile } from './_utils.js';
import { getFormat, registerJSModule, run, runAsync, runEvent } from './_python.js';
import { stdio, buffered } from './_io.js';
import mip from '../python/mip.js';
import zip from '../zip.js';

const type = 'micropython';

// REQUIRES INTEGRATION TEST
/* c8 ignore start */
export default {
    type,
    module: (version = '1.22.0-272') =>
        `https://cdn.jsdelivr.net/npm/@micropython/micropython-webassembly-pyscript@${version}/micropython.mjs`,
    async engine({ loadMicroPython }, config, url) {
        const { stderr, stdout, get } = stdio({
            stderr: buffered(console.error),
            stdout: buffered(console.log),
        });
        url = url.replace(/\.m?js$/, '.wasm');
        const interpreter = await get(loadMicroPython({ linebuffer: false, stderr, stdout, url }));
        if (config.files) await fetchFiles(this, interpreter, config.files);
        if (config.fetch) await fetchPaths(this, interpreter, config.fetch);
        if (config.js_modules) await fetchJSModules(config.js_modules);

        // Install Micropython Package
        this.writeFile(interpreter, './mip.py', mip);
        if (config.packages){
            const mpyPackageManager = interpreter.pyimport('mip');
            for (const mpyPackage of config.packages)
                mpyPackageManager.install(mpyPackage);
        }
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
                case 'zip': {
                    const blob = new Blob([buffer], { type: 'application/zip' });
                    return zip().then(async ({ BlobReader, Uint8ArrayWriter, ZipReader }) => {
                        const zipFileReader = new BlobReader(blob);
                        const zipReader = new ZipReader(zipFileReader);
                        for (const entry of await zipReader.getEntries()) {
                            const { directory, filename } = entry;
                            if (directory) {
                                FS.mkdir(extractDir + filename);
                            }
                            else {
                                const buffer = await entry.getData(new Uint8ArrayWriter);
                                FS.writeFile(extractDir + filename, buffer, {
                                    canOwn: true,
                                });
                            }
                        }
                        zipReader.close();
                    });
                }
                case 'tar.gz': {
                    const TMP = './_.tar.gz';
                    writeFile(fs, TMP, buffer);
                    interpreter.runPython(`
                        import os, gzip, tarfile
                        tar = tarfile.TarFile(fileobj=gzip.GzipFile(fileobj=open("${TMP}", "rb")))
                        for f in tar:
                            name = f"${extractDir}{f.name[2:]}"
                            if f.type == tarfile.DIRTYPE:
                                if f.name != "./":
                                    os.mkdir(name.strip("/"))
                            else:
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
/* c8 ignore stop */
