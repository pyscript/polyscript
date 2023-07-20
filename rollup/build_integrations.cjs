const { join, resolve } = require('node:path');
const { readdirSync, writeFileSync } = require('node:fs');

const HTTP_DIR = '/test/integration/interpreter';
const HTML_FILE = resolve(
    join(__dirname, '..', 'test', 'integration.html')
);
const INTEGRATION_DIR = resolve(
    join(__dirname, '..', 'test', 'integration', 'interpreter')
);

const tests = ['<ul>'];
for (const interpreter of readdirSync(INTEGRATION_DIR)) {
    if (/\..+$/.test(interpreter)) continue;
    const li = [`<li><strong>${interpreter}</strong><ul>`];
    for (const file of readdirSync(join(INTEGRATION_DIR, interpreter))) {
        if (/\.html$/.test(file))
            li.push(`<li><a href="${HTTP_DIR}/${interpreter}/${file}">${file.slice(0, -5)}</a></li>`);
    }
    li.push('</ul>');
    tests.push(li.join(''));
}
tests.push('</ul>');

writeFileSync(HTML_FILE, `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>polyscript integration tests</title>
    </head>
    <body>${tests.join('')}</body>
</html>
`);
