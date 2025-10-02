// hackity hack hack for PyScript FUN

import { toml } from '../3rd-party.js';

const remote = async (config, packages) => {
  const repackaged = [];
  for (const pkg of packages) {
    if (pkg.endsWith('.toml')) {
      const text = await (await fetch(pkg)).text();
      const { files, js_modules, packages } = await toml(text);
      if (packages)
        repackaged.push(...(await remote(config, packages)));
      if (js_modules) {
        if (!config.js_modules) config.js_modules = {};
        const { main, worker } = js_modules;
        if (main) {
          if (!config.js_modules.main) config.js_modules.main = {};
          for (const key in main) {
            config.js_modules.main[new URL(key, pkg).href] = main[key];
          }
        }
        if (worker) {
          if (!config.js_modules.worker) config.js_modules.worker = {};
          for (const key in worker) {
            config.js_modules.worker[new URL(key, pkg).href] = worker[key];
          }
        }
      }
      if (files) {
        if (!config.files) config.files = {};
        for (const key in files) {
          config.files[new URL(key, pkg).href] = files[key];
        }
      }
    }
    else repackaged.push(pkg);
  }
  return [...new Set(repackaged)];
};

export default remote;
