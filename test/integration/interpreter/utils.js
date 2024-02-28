import { env } from '/dist/index.js';

export const init = name => env[name].then(() => {
    document.documentElement.classList.add('ready');
});
