// this file simply exports enough stuff to allow
// 3rd party libraries, including PyScript, to work
import { buffered } from './interpreter/_io.js';
import { createProgress } from './interpreter/_utils.js';
import { loadProgress as lP } from './interpreter/_python.js';
import { registry } from './interpreters.js';

const loadProgress = (type, ...rest) => lP(registry.get(type), ...rest);

export { buffered, createProgress, loadProgress };
export * from './index.js';
export * from './script-handler.js';
export * from './utils.js';
