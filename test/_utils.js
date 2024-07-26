import { writeFileShim } from "../esm/interpreter/_utils.js";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FS = {
    mkdir(...args) {
        this.mkdir_args = args;
    },
    cwd: () => dirname(fileURLToPath(import.meta.url)),
    writeFile(...args) {
        this.writeFile_args = args;
    },
};

// REQUIRE INTEGRATION TESTS
writeFileShim(FS, "./test/abc.js", []);
writeFileShim(FS, "/./../abc.js", []);
