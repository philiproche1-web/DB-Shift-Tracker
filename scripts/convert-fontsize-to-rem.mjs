//
// One-off codemod: converts every hardcoded numeric `fontSize` (px, the
// implicit unit for a bare number in a React inline style) to its rem
// equivalent, so OS/browser text-size accessibility settings can scale the
// app's text. See docs/superpowers/specs/2026-08-16-font-scaling-design.md.
//
// Deleted once Tasks 2–3 of that plan have run against every file that
// needed it — this is a migration tool, not a permanent part of the app.
// The guardrail test (src/fontSizeUnits.test.js) is what protects against
// regressions after this script is gone.
import fs from "node:fs";

// rem = px / 16 (browser default root font-size). Exact division, no
// rounding. Every distinct px value found in the codebase as of 2026-08-16
// — see the plan's Global Constraints table. Add new entries here (and to
// that table) before converting any file that introduces a new size.
const TABLE = {
  "10": "0.625rem",
  "10.5": "0.65625rem",
  "11": "0.6875rem",
  "11.5": "0.71875rem",
  "12": "0.75rem",
  "12.5": "0.78125rem",
  "13": "0.8125rem",
  "13.5": "0.84375rem",
  "14": "0.875rem",
  "15": "0.9375rem",
  "16": "1rem",
  "17": "1.0625rem",
  "18": "1.125rem",
  "20": "1.25rem",
  "22": "1.375rem",
  "23": "1.4375rem",
  "24": "1.5rem",
  "26": "1.625rem",
  "28": "1.75rem",
};

// Matches a raw numeric fontSize literal (e.g. `fontSize:16` or
// `fontSize: 13.5`) but not an already-converted string value
// (`fontSize:"1rem"` never matches — the char after the colon/whitespace
// is a quote, not a digit).
const RAW_FONT_SIZE = /fontSize:\s*(\d+(?:\.\d+)?)\b/g;

export function convertFontSizes(source) {
  let count = 0;
  const result = source.replace(RAW_FONT_SIZE, (_match, num) => {
    const rem = TABLE[num];
    if (!rem) throw new Error(`No rem mapping for fontSize value "${num}px" — add it to TABLE in scripts/convert-fontsize-to-rem.mjs first.`);
    count++;
    return `fontSize:"${rem}"`;
  });
  return { result, count };
}

// CLI: node scripts/convert-fontsize-to-rem.mjs <file1> <file2> ...
// Converts each file in place and prints a per-file + total count.
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/convert-fontsize-to-rem.mjs");
if (isMain) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: node scripts/convert-fontsize-to-rem.mjs <file...>");
    process.exit(1);
  }
  let total = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const { result, count } = convertFontSizes(source);
    fs.writeFileSync(file, result);
    console.log(`${file}: ${count} conversions`);
    total += count;
  }
  console.log(`Total: ${total} conversions across ${files.length} file(s)`);
}
