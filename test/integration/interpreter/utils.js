import '/core.js';

export const init = name => polyscript.env[name].then(() => {
    document.documentElement.classList.add('ready');
});
