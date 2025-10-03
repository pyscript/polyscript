import fetch from '@webreflection/fetch';

import { toml } from '../3rd-party.js';

const { parse } = JSON;

const href = (key, pkg) => new URL(key, pkg).href;

const addPath = (target, key, value) => {
  if (key in target)
    throw new Error(`Duplicated path: ${key}`);
  target[key] = value;
};

const addPaths = (target, source, pkg) => {
  for (const key in source)
    addPath(target, href(key, pkg), source[key]);
};

const pollute = (t_js_modules, s_js_modules, name, pkg) => {
  const source = s_js_modules[name];
  if (source) {
    t_js_modules[name] ??= {};
    addPaths(t_js_modules[name], source, pkg);
  }
};

const remote = async (
  config,
  packages = config.packages,
  set = new Set(),
) => {
  const repackaged = [];
  for (const pkg of packages) {
    // avoid re-processing already processed packages
    if (set.has(pkg)) continue;
    set.add(pkg);
    const isTOML = pkg.endsWith('.toml');
    if (isTOML || pkg.endsWith('.json')) {
      const text = await fetch(pkg).text();
      const {
        name,
        files,
        js_modules,
        packages,
      } = isTOML ? await toml(text) : parse(text);

      if (set.has(name))
        throw new Error(`Unable to process ${name} @ ${pkg}`);

      set.add(name);

      if (packages) {
        // process nested packages from the remote config
        repackaged.push(...(await remote(config, packages, set)));
      }

      if (js_modules) {
        config.js_modules ??= {};
        pollute(config.js_modules, js_modules, 'main', pkg);
        pollute(config.js_modules, js_modules, 'worker', pkg);
      }

      if (files) {
        config.files ??= {};
        addPaths(config.files, files, pkg);
      }
    }
    else repackaged.push(pkg);
  }
  return repackaged;
};

export default remote;
