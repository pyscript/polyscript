import { existsSync, readdirSync } from 'node:fs';
import { join }  from 'node:path';
import playwright from '@playwright/test';
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

// integration tests for interpreters
const TEST_INTERPRETER = join(__dirname, 'integration');

// source of truth for interpreters
const CORE_INTERPRETER = join(__dirname, '..', 'esm', 'interpreter');

for (const file of readdirSync(TEST_INTERPRETER)) {
  // filter only JS files that match their counter-part interpreter
  if (/\.js$/.test(file) && existsSync(join(CORE_INTERPRETER, file))) {
    const { default: test } = await import(join(TEST_INTERPRETER, file));
    test(
      playwright,
      `http://localhost:8080/test/integration/interpreter/${file.slice(0, -3)}`
    );
  }
}
