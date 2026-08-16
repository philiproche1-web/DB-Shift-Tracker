// src/fontSizeUnits.test.js
//
// Guards the px→rem conversion done in
// docs/superpowers/specs/2026-08-16-font-scaling-design.md against silently
// regressing: fails if any file under src/ reintroduces a raw numeric px
// fontSize literal (e.g. `fontSize:16`) instead of a rem string
// (`fontSize:"1rem"`). Every already-converted value starts with a quote
// right after the colon, so this pattern only ever matches an unconverted
// literal — same regex the one-off codemod script used to find them.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const RAW_FONT_SIZE = /fontSize:\s*\d/;

// Excludes: test files (this pattern would match this file's own docstring/
// regex source), and auditHarness.jsx — a temporary, never-shipped dev tool
// (see Task 6) allowed to use fixed px sizes for its own throwaway control
// bar, deleted before this repo's final state.
function isScannable(name) {
  if (name.endsWith(".test.js") || name.endsWith(".test.jsx")) return false;
  if (name === "auditHarness.jsx") return false;
  return /\.(js|jsx)$/.test(name);
}

function walk(dir) {
  let files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(walk(full));
    else if (isScannable(entry.name)) files.push(full);
  }
  return files;
}

describe("fontSize stays unit-safe (rem, not raw px)", () => {
  it("has no raw numeric px fontSize literal anywhere in src/", () => {
    const offenders = [];
    for (const file of walk(SRC_DIR)) {
      const lines = fs.readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (RAW_FONT_SIZE.test(line)) {
          offenders.push(`${path.relative(SRC_DIR, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
