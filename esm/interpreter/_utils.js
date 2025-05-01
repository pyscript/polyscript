import fetch from '@webreflection/fetch';

import { absoluteURL, all, entries, importCSS, importJS, isArray, isCSS } from '../utils.js';

export const RUNNING_IN_WORKER = !globalThis.window;

// REQUIRES INTEGRATION TEST
/* c8 ignore start */

// This should be the only helper needed for all Emscripten based FS exports
export const writeFile = ({ FS, PATH, PATH_FS }, path, buffer) => {
    const absPath = PATH_FS.resolve(path);
    const dirPath = PATH.dirname(absPath);
    if (FS.mkdirTree) FS.mkdirTree(dirPath);
    else mkdirTree(FS, dirPath);
    return FS.writeFile(absPath, new Uint8Array(buffer), {
        canOwn: true,
    });
};

// This is instead a fallback for Lua or others
export const writeFileShim = (FS, path, buffer) => {
    mkdirTree(FS, dirname(path));
    path = resolve(FS, path);
    return FS.writeFile(path, new Uint8Array(buffer), { canOwn: true });
};

const dirname = (path) => {
    const tree = path.split('/');
    tree.pop();
    return tree.join('/');
};

export const mkdirTree = (FS, path) => {
    const current = [];
    for (const branch of path.split('/')) {
        if (branch === '.' || branch === '..') continue;
        current.push(branch);
        if (branch) FS.mkdir(current.join('/'));
    }
};

const resolve = (FS, path) => {
    const tree = [];
    for (const branch of path.split('/')) {
        switch (branch) {
            case '':
                break;
            case '.':
                break;
            case '..':
                tree.pop();
                break;
            default:
                tree.push(branch);
        }
    }
    return [FS.cwd()].concat(tree).join('/').replace(/^\/+/, '/');
};

const calculateFetchPaths = (config_fetch) => {
    for (const { files, to_file, from = '' } of config_fetch) {
        if (files !== undefined && to_file !== undefined)
            throw new Error(
                'Cannot use \'to_file\' and \'files\' parameters together!',
            );
        if (files === undefined && to_file === undefined && from.endsWith('/'))
            throw new Error(
                `Couldn't determine the filename from the path ${from}, please supply 'to_file' parameter.`,
            );
    }
    return config_fetch.flatMap(
        ({ from = '', to_folder = '.', to_file, files }) => {
            if (isArray(files))
                return files.map((file) => ({
                    url: joinPaths([from, file]),
                    path: joinPaths([to_folder, file]),
                }));
            const filename = to_file || from.slice(1 + from.lastIndexOf('/'));
            return [{ url: from, path: joinPaths([to_folder, filename]) }];
        },
    );
};

const joinPaths = (parts) => {
    const res = parts
        .map((part) => part.trim().replace(/(^[/]*|[/]*$)/g, ''))
        .filter((p) => p !== '' && p !== '.')
        .join('/');

    return parts[0].startsWith('/') ? `/${res}` : res;
};

const fetchBuffer = (url, baseURL) =>
    fetch(absoluteURL(url, baseURL)).arrayBuffer();

export const fetchPaths = (module, interpreter, config_fetch, baseURL) =>
    all(
        calculateFetchPaths(config_fetch).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(interpreter, path, buffer)),
        ),
    );

    const fillName = (source, dest) => dest.endsWith('/') ?
                        `${dest}${source.split('/').pop()}` : dest;

const parseTemplate = (src, map) => src.replace(
  /\{.+?\}/g,
  k => {
    if (!map.has(k))
      throw new SyntaxError(`Invalid template: ${k}`);
    return map.get(k);
  }
);

const calculateFilesPaths = files => {
  const map = new Map;
  const targets = new Set;
  const sourceDest = [];
  for (const [source, dest] of entries(files)) {
    if (/^\{.+\}$/.test(source)) {
      if (map.has(source))
        throw new SyntaxError(`Duplicated template: ${source}`);
      map.set(source, parseTemplate(dest, map));
    }
    else {
      const url = parseTemplate(source, map);
      const path = fillName(url, parseTemplate(dest || './', map));
      if (targets.has(path) && !path.endsWith('/*'))
        throw new SyntaxError(`Duplicated destination: ${path}`);
      targets.add(path);
      sourceDest.push({ url, path });
    }
  }
  return sourceDest;
};

export const fetchFiles = (module, interpreter, config_files, baseURL) =>
    all(
        calculateFilesPaths(config_files).map(({ url, path }) =>
            fetchBuffer(url, baseURL)
                .then((buffer) => module.writeFile(
                    interpreter,
                    path,
                    buffer,
                    url,
                )),
        ),
    );

export const fetchJSModules = ({ main, worker }, baseURL) => {
    const promises = [];
    if (worker && RUNNING_IN_WORKER) {
        for (let [source, name] of entries(worker)) {
            source = absoluteURL(source, baseURL);
            promises.push(importJS(source, name));
        }
    }
    if (main && !RUNNING_IN_WORKER) {
        for (let [source, name] of entries(main)) {
            source = absoluteURL(source, baseURL);
            if (isCSS(source)) importCSS(source);
            else promises.push(importJS(source, name));
        }
    }
    return all(promises);
};

export const createProgress = prefix => detail => {
    dispatchEvent(new CustomEvent(`${prefix}:progress`, { detail }));
};
/* c8 ignore stop */
