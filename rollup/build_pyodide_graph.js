import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join }  from 'node:path';
import { chromium } from 'playwright';
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// avoid fetching details for version below this one
const IGNORE_BELOW = '0.27';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pyodideVersion = join(__dirname, '..', 'versions', 'pyodide');
const pyodideGraph = join(__dirname, 'pyodide_graph.json');
const pyodideURL = (version = 'stable') => `https://pyodide.org/en/${version}/usage/packages-in-pyodide.html`;
const semver = value => value.split('.').map(i => parseInt(i, 10));
const [bmaj, bmin] = semver(IGNORE_BELOW);

let json = existsSync(pyodideGraph) ? JSON.parse(readFileSync(pyodideGraph)) : {};

(async () => {
  // prevent useless fetching of Pyodide site
  const latest = readFileSync(pyodideVersion).toString('utf-8').trim();
  if (json.hasOwnProperty(latest)) {
    console.log(`Graph already updated up to ${latest}`);
    return;
  }

  delete json.latest;
  delete json.stable;

  const browser = await chromium.launch();  // Or 'firefox' or 'webkit'.
  const page = await browser.newPage();
  await page.goto(pyodideURL());
  await page.waitForLoadState();

  // fetch from stable all known versions
  const versions = await page.evaluate(async () => {
    let ce;
    while (!(ce = document.querySelector('readthedocs-flyout')))
      await new Promise(resolve => setTimeout(resolve, 100));

    const dds = ce.shadowRoot.querySelectorAll('dl.versions dd');
    return [...dds].map(dd => dd.innerText);
  });

  // per each version fetch pages not known already
  for (const version of versions) {
    if (json.hasOwnProperty(version)) continue;

    // ignore too old versions
    if (/^\d+\.\d+/.test(version)) {
      const [major, minor] = semver(version);
      if (minor < bmin && major <= bmaj) continue;
    }

    console.log(`Fetching ${version} related packages`);
    try {
      await page.goto(pyodideURL(version));
      await page.waitForLoadState();
      json[version] = Object.fromEntries(
        await page.evaluate(() => [
          ...document.querySelectorAll('#packages-built-in-pyodide table > tbody > tr')
        ].map(tr => [
          ...tr.querySelectorAll('td')
        ].map(td => td.innerText.toLowerCase())))
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    catch (error) {
      console.error(error);
      break;
    }
  }
  await browser.close();

  const ordered = {};
  for (const version of versions)
    ordered[version] = json[version];

  json = ordered;

  // save content as readable JSON and get out
  writeFileSync(join(__dirname, 'pyodide_graph.json'), JSON.stringify(json, null, '\t'));
})();

const reduced = {
  v: Object.keys(json),
  p: {},
};

for (let i = 0; i < reduced.v.length; i++) {
  for (const pkg of Object.keys(json[reduced.v[i]])) {
    reduced.p[pkg] ??= [];
    reduced.p[pkg].push(i)
  }
}

// store the graph as JS module so we can optionally import it
writeFileSync(
  join(__dirname, '..', 'esm', 'interpreter', 'pyodide_graph.js'),
  `// ⚠️ GENERATED AUTOMATICALLY - DO NOT MODIFY
export default new Proxy(
    ${JSON.stringify(reduced).replace(/"/g, "'")},
    {
        has: (target, version) => target.v.includes(version),
        get: (target, version) => {
          const i = target.v.indexOf(version);
          return new Proxy(target.p, {
            has: (target, pkg) => target[pkg]?.includes(i),
          });
        },
    },
);
`,
);
