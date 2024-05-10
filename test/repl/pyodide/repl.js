// Xterm.js dependencies via CDN
const CDN = 'https://cdn.jsdelivr.net/npm';
const XTERM = '5.3.0';
const ADDON_FIT = '0.10.0';
const ADDON_WEB_LINKS = '0.11.0';
const READLINE = '1.1.1';

const { assign } = Object;

const dependencies = ({ ownerDocument }) => {
  const rel = 'stylesheet';
  const href = `${CDN}/xterm@${XTERM}/css/xterm.min.css`;
  const link = `link[rel="${rel}"][href="${href}"]`;
  if (!ownerDocument.querySelector(link)) {
    ownerDocument.head.append(
      assign(ownerDocument.createElement('link'), { rel, href })
    );
  }
  return [
    import(`${CDN}/xterm@${XTERM}/+esm`),
    import(`${CDN}/@xterm/addon-fit@${ADDON_FIT}/+esm`),
    import(`${CDN}/@xterm/addon-web-links@${ADDON_WEB_LINKS}/+esm`),
    import(`${CDN}/xterm-readline@${READLINE}/+esm`),
  ];
};

export default async ({ interpreter, run }, target) => {
  const libs = dependencies(target);

  const namespace = interpreter.globals.get('dict')();

  run(`
    import sys
    from pyodide.ffi import to_js
    from pyodide.console import PyodideConsole, repr_shorten, BANNER
    import __main__
    BANNER = "Welcome to the Pyodide terminal emulator 🐍\\n" + BANNER
    pyconsole = PyodideConsole(__main__.__dict__)
    import builtins
    async def await_fut(fut):
      res = await fut
      if res is not None:
        builtins._ = res
      return to_js([res], depth=1)
    def clear_console():
      pyconsole.buffer = []
  `, { globals: namespace });

  const repr_shorten = namespace.get('repr_shorten');
  const banner = namespace.get('BANNER');
  const await_fut = namespace.get('await_fut');
  const pyconsole = namespace.get('pyconsole');

  const [
    { Terminal },
    { FitAddon },
    { WebLinksAddon },
  ] = await Promise.all(libs);

  const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      theme: {
          background: "#191A19",
          foreground: "#F5F2E7",
      },
  });

  let queue = Promise.resolve('');
  let acc = '';
  terminal.onData(buffer => {
    terminal.write(buffer);
    acc += buffer;
    if (acc.endsWith('\r')) {
      const line = acc;
      acc = '';
      const fut = pyconsole.push(line);
      const wrapped = await_fut(fut);
      queue = queue.then(async () => {
        try {
          const [ value ] = await wrapped;
          terminal.write('\r\n');
          if (value) {
            repr_shorten.callKwargs(value, {
              separator: "\n<long output truncated>\n",
            });
            terminal.write(String(value) + '\r\n>>> ');
          }
          else {
            terminal.write('... ');
          }
          if (value instanceof interpreter.ffi.PyProxy)
            value.destroy();
        }
        catch(e) {
          if (e.constructor.name === "PythonError") {
            const message = fut.formatted_error || e.message;
            terminal.write(message.trimEnd().replace(/\n/g, '\r\n>>> '));
          } else {
            throw e;
          }
        }
        finally {
          fut.destroy();
          wrapped.destroy();
        }
      });
    }
  });

  const fitAddon = new FitAddon;
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon);
  terminal.open(target);
  fitAddon.fit();
  terminal.focus();

  return terminal;
};
