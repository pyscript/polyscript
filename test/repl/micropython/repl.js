// Xterm.js dependencies via CDN
const CDN = 'https://cdn.jsdelivr.net/npm';
const XTERM = '5.3.0';
const ADDON_FIT = '0.10.0';
const ADDON_WEB_LINKS = '0.11.0';

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
  ];
};

export default async ({ interpreter, io, run }, target) => {
  const [
    { Terminal },
    { FitAddon },
    { WebLinksAddon },
  ] = await Promise.all(dependencies(target));

  const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      theme: {
          background: "#191A19",
          foreground: "#F5F2E7",
      },
  });

  const encoder = new TextEncoderStream;
  encoder.readable.pipeTo(
    new WritableStream({
      write(buffer) {
        for (const c of buffer)
          interpreter.replProcessChar(c);
      }
    })
  );

  const missingReturn = new Uint8Array([13]);
  io.stdout = buffer => {
    // apparently Python swallows \r on output
    // so we need to monkey patch this when \n
    // is sent but no \r was previously added
    if (buffer[0] === 10)
      terminal.write(missingReturn);
    terminal.write(buffer);
  };

  const writer = encoder.writable.getWriter();
  terminal.onData(buffer => writer.write(buffer));

  const fitAddon = new FitAddon;
  terminal.loadAddon(fitAddon);
  terminal.loadAddon(new WebLinksAddon);
  terminal.open(target);
  fitAddon.fit();
  terminal.focus();

  interpreter.replInit();

  run('from js import prompt as input');

  return terminal;
};
