import { env } from '/core.js';

export const init = name => env[name].then(() => {
    document.documentElement.classList.add('ready');
});
