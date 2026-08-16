# Font Scaling (px → rem) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every hardcoded numeric `fontSize` (px) in the app to its rem equivalent, so OS/browser text-size accessibility settings scale the app's text, with no layout regressions and no new in-app UI.

**Architecture:** A one-off Node codemod script does the mechanical px→rem substitution (366 occurrences, 20 files) using a fixed, exact lookup table (`rem = px / 16`). A grep-based Vitest test then guards against the pattern ever being reintroduced. A temporary browser harness (mirroring the 08-14 audit's approach) lets every real screen be visually checked at 100%/150%/200% simulated OS text size, past the login wall, before either the harness or the codemod script are deleted.

**Tech Stack:** React (inline style objects), Vite, Vitest, plain Node (`node:fs`, `node:path`) for the codemod — no new dependencies.

## Global Constraints

- Conversion formula: `rem = px / 16` (browser default root font-size is 16px; confirmed no root override in `src/index.css`). Exact decimal division, no rounding.
- Canonical conversion table (all 19 distinct px values found in the codebase — do not invent others without adding them here first):

  | px | rem |
  |----|-----|
  | 10 | 0.625rem |
  | 10.5 | 0.65625rem |
  | 11 | 0.6875rem |
  | 11.5 | 0.71875rem |
  | 12 | 0.75rem |
  | 12.5 | 0.78125rem |
  | 13 | 0.8125rem |
  | 13.5 | 0.84375rem |
  | 14 | 0.875rem |
  | 15 | 0.9375rem |
  | 16 | 1rem |
  | 17 | 1.0625rem |
  | 18 | 1.125rem |
  | 20 | 1.25rem |
  | 22 | 1.375rem |
  | 23 | 1.4375rem |
  | 24 | 1.5rem |
  | 26 | 1.625rem |
  | 28 | 1.75rem |

- Only `fontSize` values convert. `padding`, `borderRadius`, `width`/`height`, icon sizes, and every other px value stay untouched.
- No new npm dependencies. No in-app text-size toggle. No changes to `src/index.css` or the viewport meta tag.
- The guardrail regex (both the codemod's match and the regression test's check) is `fontSize:\s*\d` — a colon then whitespace then a bare digit. Every already-converted value starts with a quote (`fontSize:"…rem"`), so this pattern only ever matches an unconverted raw px literal.
- Repo root: `C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App`. Test command: `npm test` (runs `vitest run`, currently 281 tests, all passing).

---

### Task 1: Write and test the px→rem codemod script

**Files:**
- Create: `scripts/convert-fontsize-to-rem.mjs`
- Test: `scripts/convert-fontsize-to-rem.test.mjs`

**Interfaces:**
- Produces: `convertFontSizes(source: string) => { result: string, count: number }`, exported from `scripts/convert-fontsize-to-rem.mjs`, used directly by its own test and indirectly (via the CLI block in the same file) by Tasks 2 and 3.

- [x] **Step 1: Write the failing test**

```js
// scripts/convert-fontsize-to-rem.test.mjs
import { describe, it, expect } from "vitest";
import { convertFontSizes } from "./convert-fontsize-to-rem.mjs";

describe("convertFontSizes", () => {
  it("converts a plain integer px value to its rem equivalent", () => {
    const { result, count } = convertFontSizes('const x = {fontSize:16,color:"red"};');
    expect(result).toBe('const x = {fontSize:"1rem",color:"red"};');
    expect(count).toBe(1);
  });

  it("converts a decimal px value to its rem equivalent", () => {
    const { result, count } = convertFontSizes("const x = {fontSize:11.5};");
    expect(result).toBe('const x = {fontSize:"0.71875rem"};');
    expect(count).toBe(1);
  });

  it("converts a value with a space after the colon", () => {
    const { result, count } = convertFontSizes("const x = {fontSize: 13};");
    expect(result).toBe('const x = {fontSize:"0.8125rem"};');
    expect(count).toBe(1);
  });

  it("converts every occurrence in a multi-line file", () => {
    const src = [
      'export let a={fontSize:16};',
      'export let b={fontSize:11};',
      'export const c=(x)=>({fontSize:24});',
    ].join("\n");
    const { result, count } = convertFontSizes(src);
    expect(count).toBe(3);
    expect(result).toContain('fontSize:"1rem"');
    expect(result).toContain('fontSize:"0.6875rem"');
    expect(result).toContain('fontSize:"1.5rem"');
  });

  it("leaves an already-converted rem value untouched", () => {
    const { result, count } = convertFontSizes('const x = {fontSize:"1rem"};');
    expect(result).toBe('const x = {fontSize:"1rem"};');
    expect(count).toBe(0);
  });

  it("throws on a px value with no table entry, naming the bad value", () => {
    expect(() => convertFontSizes("const x = {fontSize:99};")).toThrow('fontSize value "99px"');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && npx vitest run scripts/convert-fontsize-to-rem.test.mjs`
Expected: FAIL — `convert-fontsize-to-rem.mjs` does not exist yet (module not found).

- [x] **Step 3: Write the implementation**

```js
// scripts/convert-fontsize-to-rem.mjs
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
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/convert-fontsize-to-rem.test.mjs`
Expected: PASS — 6 tests passing.

- [x] **Step 5: Commit**

```bash
git add scripts/convert-fontsize-to-rem.mjs scripts/convert-fontsize-to-rem.test.mjs
git commit -m "feat: add px-to-rem fontSize codemod script"
```

---

### Task 2: Convert `theme.js` (shared style tokens)

**Files:**
- Modify: `src/lib/theme.js:29-31,41-42`

**Interfaces:**
- Consumes: `convertFontSizes` behavior verified by Task 1 (not imported here — run via the script's CLI).

- [x] **Step 1: Run the codemod against theme.js**

Run: `cd "C:\Users\phili\.claude\Claude Code\DB 5 Wk Tracker App" && node scripts/convert-fontsize-to-rem.mjs src/lib/theme.js`
Expected output: `src/lib/theme.js: 5 conversions` then `Total: 5 conversions across 1 file(s)`.

- [x] **Step 2: Verify the diff by eye**

Run: `git diff src/lib/theme.js`
Expected: exactly 5 changed lines, each a `fontSize:16` → `fontSize:"1rem"` or `fontSize:11` → `fontSize:"0.6875rem"` substitution (lines 29, 30, 31, 41, 42), nothing else touched.

- [x] **Step 3: Confirm no raw px fontSize remains in the file**

Run: `grep -n "fontSize:[[:space:]]*[0-9]" src/lib/theme.js`
Expected: no output (empty match — grep exits 1).

- [x] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — 287 tests (281 baseline + Task 1's 6 new codemod-script tests; theme.test.js's contrast-ratio tests are colour-only and unaffected by this change).

- [x] **Step 5: Commit**

```bash
git add src/lib/theme.js
git commit -m "refactor: convert theme.js fontSize tokens from px to rem"
```

---

### Task 3: Convert the remaining 19 files

**Files:**
- Modify: `src/App.jsx`, `src/components/shared.jsx`, `src/screens/ArchiveScreen.jsx`, `src/screens/AuthScreen.jsx`, `src/screens/DutyLookup.jsx`, `src/screens/FAQScreen.jsx`, `src/screens/GarageComingSoonScreen.jsx`, `src/screens/HomeScreen.jsx`, `src/screens/LeaveScreen.jsx`, `src/screens/LogDayOffScreen.jsx`, `src/screens/LogScreen.jsx`, `src/screens/PeriodScreen.jsx`, `src/screens/ResetPasswordScreen.jsx`, `src/screens/SettingsPanel.jsx`, `src/screens/SetupScreen.jsx`, `src/screens/TermsScreen.jsx`, `src/screens/TourOverlay.jsx`, `src/screens/WhatsNewScreen.jsx`, `src/components/ErrorBoundary.jsx`

**Interfaces:**
- Consumes: `convertFontSizes` behavior verified by Task 1, run via the script's CLI.

- [x] **Step 1: Run the codemod against every remaining file in one pass**

Run (single command, repo root):
```bash
node scripts/convert-fontsize-to-rem.mjs \
  src/App.jsx \
  src/components/shared.jsx \
  src/components/ErrorBoundary.jsx \
  src/screens/ArchiveScreen.jsx \
  src/screens/AuthScreen.jsx \
  src/screens/DutyLookup.jsx \
  src/screens/FAQScreen.jsx \
  src/screens/GarageComingSoonScreen.jsx \
  src/screens/HomeScreen.jsx \
  src/screens/LeaveScreen.jsx \
  src/screens/LogDayOffScreen.jsx \
  src/screens/LogScreen.jsx \
  src/screens/PeriodScreen.jsx \
  src/screens/ResetPasswordScreen.jsx \
  src/screens/SettingsPanel.jsx \
  src/screens/SetupScreen.jsx \
  src/screens/TermsScreen.jsx \
  src/screens/TourOverlay.jsx \
  src/screens/WhatsNewScreen.jsx
```
Expected: 19 per-file lines, counts matching `11, 29, 6, 6, 14, 23, 7, 2, 60, 39, 8, 30, 30, 6, 58, 6, 15, 5, 6` respectively, then `Total: 361 conversions across 19 file(s)`.

- [x] **Step 2: Verify total occurrence count matches**

Run: `grep -rc 'fontSize:"' src/App.jsx src/components/shared.jsx src/components/ErrorBoundary.jsx src/screens/*.jsx src/lib/theme.js | awk -F: '{s+=$2} END {print s}'`
Expected: `366` (361 from this task's 19 files + 5 from Task 2's `src/lib/theme.js`, included here to check the whole app's total in one number — if it differs, check which individual file's count is off before proceeding).

- [x] **Step 3: Confirm no raw px fontSize remains anywhere in src/**

Run: `grep -rn "fontSize:[[:space:]]*[0-9]" src --include=*.jsx --include=*.js`
Expected: no output.

- [x] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS — 287 tests (unchanged from Task 2 — this is a value-only change; no test asserts a specific fontSize value, confirmed by `grep -rl "fontSize" src --include=*.test.jsx --include=*.test.js` returning nothing before this plan started).

- [x] **Step 5: Run the production build**

Run: `npm run build`
Expected: succeeds with no errors (catches any syntax mistake the codemod could have introduced, e.g. an unbalanced quote).

- [x] **Step 6: Commit**

```bash
git add src/App.jsx src/components/shared.jsx src/components/ErrorBoundary.jsx src/screens/*.jsx
git commit -m "refactor: convert remaining fontSize tokens from px to rem"
```

---

### Task 4: Delete the codemod script (migration complete)

**Files:**
- Delete: `scripts/convert-fontsize-to-rem.mjs`
- Delete: `scripts/convert-fontsize-to-rem.test.mjs`

**Interfaces:**
- Consumes: confirmation from Task 3 that all 366 occurrences are converted (this script has no more files left to convert).

- [x] **Step 1: Confirm nothing else references the script**

Run: `grep -rn "convert-fontsize-to-rem" --include=*.json --include=*.md --include=*.mjs --include=*.js .  --exclude-dir=node_modules --exclude-dir=.git`
Expected: only this plan document and the design spec mention it by name — nothing in `package.json` scripts or CI config references it (confirm by eye; if something does, keep the script and skip this task's deletion).

- [x] **Step 2: Delete the files**

```bash
git rm scripts/convert-fontsize-to-rem.mjs scripts/convert-fontsize-to-rem.test.mjs
```

- [x] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — 281 tests (287 minus the 6 codemod-script tests removed with it — back to the pre-plan baseline).

- [x] **Step 4: Commit**

```bash
git commit -m "chore: remove px-to-rem codemod script, conversion complete"
```

---

### Task 5: Add the guardrail regression test

**Files:**
- Create: `src/fontSizeUnits.test.js`

**Interfaces:**
- Produces: nothing consumed elsewhere — this is a standalone regression test, run automatically by `npm test`.

- [x] **Step 1: Write the test**

```js
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
```

- [x] **Step 2: Run it and confirm it passes immediately**

Run: `npx vitest run src/fontSizeUnits.test.js`
Expected: PASS — 1 test, 0 offenders (Tasks 2–3 already converted everything; this test documents and locks that state rather than driving new behavior, so it's expected green on first run, not red).

- [x] **Step 3: Prove the guardrail actually catches a regression**

Run: `node -e "const fs=require('node:fs'); fs.writeFileSync('src/lib/__tmp_regress.js', 'export const x = {fontSize:16};')"`
then: `npx vitest run src/fontSizeUnits.test.js`
Expected: FAIL — 1 offender reported, `src/lib/__tmp_regress.js:1: export const x = {fontSize:16};`
then clean up: `rm src/lib/__tmp_regress.js` and re-run `npx vitest run src/fontSizeUnits.test.js` to confirm it's back to PASS.

- [x] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — 282 tests (281 + this new guardrail test).

- [x] **Step 5: Commit**

```bash
git add src/fontSizeUnits.test.js
git commit -m "test: guard against raw px fontSize regressions"
```

---

### Task 6: Build the temporary visual-verification harness

**Files:**
- Create: `audit.html`
- Create: `src/auditHarness.jsx`

**Interfaces:**
- Produces: a dev-server route (`/audit.html`) that mounts every screen touched by this plan with fixture data and a text-size selector, for Task 7's manual visual pass. Deleted in Task 8.

- [x] **Step 1: Create the HTML entry**

```html
<!-- audit.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Font Scaling Audit Harness (temporary — delete before merge)</title>
  </head>
  <body style="margin:0">
    <div id="root"></div>
    <script type="module" src="/src/auditHarness.jsx"></script>
  </body>
</html>
```

- [x] **Step 2: Create the harness component**

```jsx
// src/auditHarness.jsx
//
// TEMPORARY — built for docs/superpowers/specs/2026-08-16-font-scaling-design.md's
// visual-verification pass (see the plan's Task 7), same pattern as the
// 2026-08-14 audit's `audit.html` + `auditHarness.jsx`. Mounts every real
// screen with fixture data, bypassing the login wall, with a control bar to
// switch screens and simulate OS/browser text-size scaling. Deleted in
// Task 8 once verification is done — never shipped.
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { today, sundayOf, addDays } from "./lib/dutyMath.js";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { LogScreen } from "./screens/LogScreen.jsx";
import { LogDayOffScreen } from "./screens/LogDayOffScreen.jsx";
import { PeriodScreen } from "./screens/PeriodScreen.jsx";
import { LeaveScreen } from "./screens/LeaveScreen.jsx";
import { ArchiveScreen } from "./screens/ArchiveScreen.jsx";
import { DutyLookup } from "./screens/DutyLookup.jsx";
import { SettingsPanel } from "./screens/SettingsPanel.jsx";
import { SetupScreen } from "./screens/SetupScreen.jsx";
import { TermsScreen } from "./screens/TermsScreen.jsx";
import { FAQScreen } from "./screens/FAQScreen.jsx";
import { WhatsNewScreen } from "./screens/WhatsNewScreen.jsx";
import { TourOverlay } from "./screens/TourOverlay.jsx";
import { GarageComingSoonScreen } from "./screens/GarageComingSoonScreen.jsx";
import AuthScreen from "./screens/AuthScreen.jsx";
import ResetPasswordScreen from "./screens/ResetPasswordScreen.jsx";

const noop = () => {};
const start = sundayOf(today());
const todayDate = today();

function shift(id, date, over = {}) {
  return {
    id, date, zone: "Zone 1", roster: "SZ1/01", duty: "005001", fixedType: null,
    reportTime: "05:40", signOffTime: "13:55", workHours: 7.5, reliefHours: 0.5,
    isSpare: false, isRestDay: false, overtimeHours: 0, overtimeNote: "", notes: "",
    ...over,
  };
}

const period = {
  id: "p1",
  startDate: start,
  createdAt: new Date("2026-01-01").toISOString(),
  shifts: [shift("s1", todayDate)],
  daysOff: [{ id: "d1", date: addDays(todayDate, 3), type: "Annual Leave" }],
  removedFixedRestDates: [todayDate],
};
const periods = [period];
const leaveSettings = { annualTotal: 20 };
const driverCustomRestDays = { enabled: false, weekdays: [], since: null };

const SCREENS = {
  Home: <HomeScreen period={period} periods={periods} alerts={[]} onViewAlerts={noop}
    driverFirstName="Phil" userId="test-user" onLog={noop} onLogDate={noop} onGoWeek={noop}
    justRolledPeriod={null} onDismissRolloverBanner={noop} onOpenSettings={noop} />,
  Log: <LogScreen period={period} editShift={null} lookupDuty={null} initialDate={null} initialRestDay={false}
    alerts={[]} onSave={noop} onCancel={noop} onEditConflict={noop} onOpenSettings={noop} />,
  LogDayOff: <LogDayOffScreen periods={periods} editDayOff={null} onSave={noop} onCancel={noop} onOpenSettings={noop} />,
  Period: <PeriodScreen period={period} onEdit={noop} onDelete={noop} onEditDayOff={noop} onDeleteDayOff={noop}
    onViewArchive={noop} onViewFAQ={noop} onOpenSettings={noop} />,
  Leave: <LeaveScreen periods={periods} leaveSettings={leaveSettings} onLogDayOff={noop} onEditDayOff={noop}
    onDeleteDayOff={noop} onViewFAQ={noop} onOpenSettings={noop} />,
  Archive: <ArchiveScreen periods={periods} activePeriodId="p1" onView={noop} onOpenSettings={noop} />,
  DutyLookup: <DutyLookup alerts={[]} onLogShift={noop} onOpenSettings={noop} />,
  Settings: <SettingsPanel period={period} onClose={noop} onThemeChange={noop} leaveSettings={leaveSettings}
    onLeaveSettingsChange={noop} onReplayTour={noop} onViewTerms={noop} onViewFAQ={noop} onEditStartDate={noop}
    driverGarage="Broadstone" onChangeGarage={noop} driverFirstName="Phil" onChangeFirstName={noop}
    driverCustomRestDays={driverCustomRestDays} onChangeCustomRestDays={noop} userId="test-user" onSendFeedback={noop} />,
  Setup: <SetupScreen onCreate={noop} />,
  Terms: <TermsScreen onAccept={noop} />,
  FAQ: <FAQScreen onClose={noop} initialCategory="" />,
  WhatsNew: <WhatsNewScreen onDone={noop} onSkipTour={noop} />,
  Tour: <TourOverlay onDone={noop} />,
  GarageComingSoon: <GarageComingSoonScreen garage="Phibsborough" onSignOut={noop} />,
  Auth: <AuthScreen supabase={{}} />,
  ResetPassword: <ResetPasswordScreen supabase={{}} onDone={noop} />,
};

function AuditHarness() {
  const [screenName, setScreenName] = useState(Object.keys(SCREENS)[0]);
  const [scale, setScale] = useState(100);

  // rem units are relative to the ROOT (<html>) font-size, not any ancestor
  // — this is what actually simulates an OS/browser text-size setting.
  // Setting fontSize on a wrapper div would do nothing to rem values.
  useEffect(() => {
    document.documentElement.style.fontSize = `${scale}%`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [scale]);

  return (
    <div>
      <div style={{
        position: "sticky", top: 0, zIndex: 9999, background: "#222", color: "#fff",
        padding: 10, display: "flex", gap: 12, alignItems: "center",
        fontFamily: "system-ui", fontSize: 14,
      }}>
        <label>Screen:{" "}
          <select value={screenName} onChange={(e) => setScreenName(e.target.value)}>
            {Object.keys(SCREENS).map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label>OS text size:{" "}
          <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
            <option value={100}>100%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>
        </label>
      </div>
      {SCREENS[screenName]}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<AuditHarness />);
```

- [x] **Step 3: Verify the harness loads**

Start the dev server: `npm run dev` (leave running), then open `http://localhost:5173/audit.html` in a browser.
Expected: the control bar renders top-left with "Screen" and "OS text size" dropdowns, and the Home screen renders below it with fixture data (today's duty card showing "SZ1/01", no console errors).

- [x] **Step 4: Commit**

```bash
git add audit.html src/auditHarness.jsx
git commit -m "test: temporary visual-verification harness for font scaling"
```

---

### Task 7: Visual verification pass — check every screen at 100%/150%/200%, fix real overflow

**Files:**
- Modify (only if a real issue is found): any of the 20 files touched in Tasks 2–3, using standard CSS fixes (`flexWrap:"wrap"`, `minWidth:0`, `overflowWrap:"break-word"`, reducing a fixed `width` to a `maxWidth`, etc.) — never by capping the fontSize back down or reverting a value to px.

**Interfaces:**
- Consumes: the running harness from Task 6, via `mcp__Claude_Browser__*` preview tools.

This task is a manual audit, not a scripted one — the point is to find whatever's actually there, the same way the 2026-08-14 audit did. Do not skip ahead to writing fixes for problems that haven't been observed yet.

- [x] **Step 1: Open the harness in the Browser pane**

Use `preview_start` with the dev server, then `navigate` to `/audit.html`. Use `resize_window` to a phone viewport (375×812, the mobile preset) — this app is used on drivers' phones, not desktop.

- [x] **Step 2: Check every screen at every scale**

For each of the 16 screens in the harness's dropdown (`Home, Log, LogDayOff, Period, Leave, Archive, DutyLookup, Settings, Setup, Terms, FAQ, WhatsNew, Tour, GarageComingSoon, Auth, ResetPassword`), for each scale (`100%, 150%, 200%`):
1. Select the screen and scale via `computer` (click) or `form_input`.
2. Take a screenshot (`computer` `screenshot`).
3. Look for: text clipped by a fixed-height/fixed-width container, two elements overlapping, a button label wrapping onto a a third line and pushing content off-screen, horizontal scroll appearing on the page (the body itself should never scroll horizontally — a single screen's card scrolling internally is fine).
4. Note any real issue found, with screen name, scale, and a one-line description.

This is 16 × 3 = 48 checks. Batch related screens together in a run when a first pass suggests a whole class is clean (e.g. if the four static-content screens — Terms, FAQ, WhatsNew, GarageComingSoon — look fine at 150%, spend more time on data-dense ones instead: Home, Period, Leave, Settings, DutyLookup, Log).

- [x] **Step 3: Fix each real issue found, one at a time**

For each issue noted in Step 2:
1. Read the relevant section of the source file to find the exact style object responsible.
2. Apply the smallest layout fix that resolves it (see the Files list above for allowed techniques) — resize font back down is not an allowed fix.
3. Reload the harness at the same screen/scale and re-screenshot to confirm the fix worked.
4. Commit that one fix on its own:

```bash
git add <file>
git commit -m "fix: prevent <element> overflow at large text scale on <ScreenName>"
```

If Step 2 found zero issues, skip straight to Step 4 with nothing to commit here.

- [x] **Step 4: Run the full test suite once more**

Run: `npm test`
Expected: PASS — 282 tests (unchanged from Task 5, unless Step 3 added new tests for a fix, in which case it should be higher).

---

### Task 8: Delete the harness, final verification, final commit

**Files:**
- Delete: `audit.html`
- Delete: `src/auditHarness.jsx`

**Interfaces:**
- Consumes: Task 7's confirmation that visual verification is complete.

- [x] **Step 1: Delete the harness**

```bash
git rm audit.html src/auditHarness.jsx
```

- [x] **Step 2: Confirm the guardrail test still passes with the harness gone**

Run: `npx vitest run src/fontSizeUnits.test.js`
Expected: PASS (the harness's own `fontSize:14` in its control bar was already excluded by filename while it existed, so removing the file changes nothing here — this just confirms nothing else broke).

- [x] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS — 282 tests (or more, if Task 7 added any).

- [x] **Step 4: Run the production build**

Run: `npm run build`
Expected: succeeds — confirms `audit.html` being gone doesn't break the Vite build (it was a second, independent entry point; deleting it should have no effect on the main `index.html` build).

- [x] **Step 5: Final commit**

```bash
git commit -m "chore: remove temporary font-scaling audit harness, verification complete"
```

- [x] **Step 6: Confirm clean state**

Run: `git status --short`
Expected: no output (clean working tree) — everything from this plan is committed.
