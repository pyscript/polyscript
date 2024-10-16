// this file simply exports enough stuff to allow
// 3rd party libraries, including PyScript, to work
import { buffered } from './interpreter/_io.js';
export { buffered };
export * from './index.js';
export * from './script-handler.js';
export * from './utils.js';
