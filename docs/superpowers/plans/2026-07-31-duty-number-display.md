# Duty Number Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a `"Duty No. {N}"` reference tag near the top of every place a duty appears (Home's Today's/Tomorrow's Duty card, Duty Lookup, each logged entry on the Period screen, and the PDF export), sourced from data the app already has, and fix the one real gap in that data (80 Zone 1 Saturday duties missing their real duty number).

**Architecture:** A new pure helper `dutyNumber(code)` in `src/lib/dutyMath.js` extracts the real duty number (last 3 digits, leading zeros stripped) from the `d2`/`shift.duty` value every duty/shift already carries. Four small, additive UI changes call it. One data-only task fixes the Zone 1 Saturday gap first, in both the live `public/roster-data.json` and the bundled `src/lib/roster.js` fallback.

**Tech Stack:** Vitest for the pure-function tests; Node for the one-off data-fix script (run once, not committed as a script — only its effect on the two data files is committed).

## Global Constraints

- The number displayed is the last 3 characters of the duty's `d2` field (catalog entries) or a saved shift's `duty` field (they're the same kind of value — `shift.duty` is copied from `duty.d2` at log time, `src/screens/LogScreen.jsx:150`), with leading zeros stripped (`"005068"` → `"68"`, `"201"` → `"201"`).
- Returns `null` (render nothing) for anything non-numeric — Spare (`"spare"`), CPC/Training (`"cpc"`), or the pre-fix Zone 1 Saturday gap shape (`d2` duplicating `r`, e.g. `"SZ1/01"`).
- Label text is exactly `"Duty No. {n}"` everywhere it appears — same wording across Home, Duty Lookup, Period screen, and the PDF export.
- Both `public/roster-data.json` (live, fetched at runtime) and the bundled `DUTIES` const in `src/lib/roster.js` (offline fallback) must carry the same fix — a fix to only one looks correct in dev (HMR reads the bundle) but wrong in prod or vice versa (see `db_5wk_tracker_gospel_sources` project memory).
- No change to any duty's own label (`r` field, e.g. `SZ1/1X`) — this is an additional reference number alongside the existing label, never a replacement.

---

### Task 1: Fix the 80 Zone 1 Saturday duty numbers

**Files:**
- Modify: `public/roster-data.json` (the `duties` array — 80 entries where `z==="Zone 1" && t==="saturday"`)
- Modify: `src/lib/roster.js` (the bundled `DUTIES` const — same 80 entries)

**Interfaces:**
- Consumes: nothing from other tasks — this is a data-only fix, independent of Tasks 2 and 3.
- Produces: every one of the 390 total duties across both files now has a numeric `d2` (previously 310 did, 80 Zone 1 Saturday duties had `d2` duplicating `r`). Tasks 2 and 3 depend on this being true for `dutyNumber` to ever return a value for a Zone 1 Saturday duty.

The exact mapping below was sourced directly from `My Drive/Duties/Zone 1/Z1 - (Mon-Sun).pdf`'s Saturday section (the gospel PDF per `db_5wk_tracker_gospel_sources` project memory) — each Saturday duty's real number is either its own label number (e.g. `SZ1/40` → `40`) or, for the 17 "BOGEY" duties, the PDF's `"DUTY N (kX)"` header pairing (verified line-by-line against the PDF text, e.g. `"DUTY 71 (1X)"` → `SZ1/1X` → `71`). All 80 map to a 6-digit code following the same `"005" + 3-digit-padded-number` format Zone 1's other duties already use (e.g. `SZ1/01` weekday already has `d2: "005001"`).

- [ ] **Step 1: Write and run the fix script**

Create a temporary file (anywhere outside the repo, e.g. your scratchpad — do not commit this script, only its effect on the two data files) named `fix-z1-saturday.js`:

```javascript
const fs = require("fs");

// Sourced from My Drive/Duties/Zone 1/Z1 - (Mon-Sun).pdf, Saturday section.
// Plain-numbered duties: real number = the duty's own label number.
// "X"-suffixed (BOGEY) duties: real number from the PDF's "DUTY N (kX)" pairing.
const MAPPING = {
  "SZ1/01": "005001", "SZ1/02": "005002", "SZ1/03": "005003", "SZ1/04": "005004",
  "SZ1/05": "005005", "SZ1/06": "005006", "SZ1/07": "005007", "SZ1/08": "005008",
  "SZ1/09": "005009", "SZ1/10": "005010", "SZ1/11": "005011", "SZ1/12": "005012",
  "SZ1/13": "005013", "SZ1/14": "005014", "SZ1/15": "005015", "SZ1/16": "005016",
  "SZ1/17": "005017", "SZ1/18": "005018", "SZ1/19": "005019", "SZ1/20": "005020",
  "SZ1/21": "005021", "SZ1/22": "005022", "SZ1/23": "005023", "SZ1/24": "005024",
  "SZ1/25": "005025", "SZ1/26": "005026", "SZ1/27": "005027", "SZ1/28": "005028",
  "SZ1/29": "005029", "SZ1/30": "005030", "SZ1/31": "005031", "SZ1/32": "005032",
  "SZ1/33": "005033", "SZ1/34": "005034", "SZ1/35": "005035", "SZ1/36": "005036",
  "SZ1/37": "005037", "SZ1/38": "005038", "SZ1/39": "005039", "SZ1/40": "005040",
  "SZ1/41": "005041", "SZ1/42": "005042", "SZ1/43": "005043", "SZ1/44": "005044",
  "SZ1/45": "005045", "SZ1/46": "005046", "SZ1/47": "005047", "SZ1/48": "005048",
  "SZ1/49": "005049", "SZ1/50": "005050", "SZ1/51": "005051", "SZ1/52": "005052",
  "SZ1/53": "005053", "SZ1/54": "005054", "SZ1/55": "005055", "SZ1/56": "005056",
  "SZ1/57": "005057", "SZ1/91": "005091", "SZ1/92": "005092", "SZ1/93": "005093",
  "SZ1/94": "005094", "SZ1/95": "005095", "SZ1/96": "005096",
  "SZ1/1X": "005071", "SZ1/2X": "005072", "SZ1/3X": "005073", "SZ1/4X": "005074",
  "SZ1/5X": "005075", "SZ1/6X": "005076", "SZ1/7X": "005077", "SZ1/8X": "005078",
  "SZ1/9X": "005079", "SZ1/10X": "005080", "SZ1/11X": "005081", "SZ1/12X": "005082",
  "SZ1/13X": "005083", "SZ1/14X": "005084", "SZ1/15X": "005085", "SZ1/16X": "005086",
  "SZ1/17X": "005087",
};

function fixDuties(duties) {
  let fixed = 0;
  duties.forEach(d => {
    if (d.z === "Zone 1" && d.t === "saturday" && MAPPING[d.r]) {
      d.d2 = MAPPING[d.r];
      fixed++;
    }
  });
  return fixed;
}

// 1. public/roster-data.json
const jsonPath = "public/roster-data.json";
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const jsonFixed = fixDuties(data.duties);
data.version = "2026-07-31";
fs.writeFileSync(jsonPath, JSON.stringify(data));
console.log(`public/roster-data.json: fixed ${jsonFixed} entries (expected 80)`);

// 2. src/lib/roster.js bundled DUTIES const
const rosterJsPath = "src/lib/roster.js";
const src = fs.readFileSync(rosterJsPath, "utf8");
const match = src.match(/export let DUTIES\s*=(\[.*?\]);/s);
if (!match) throw new Error("Could not find `export let DUTIES = [...]` in src/lib/roster.js");
const DUTIES = eval(match[1]);
const jsFixed = fixDuties(DUTIES);
const newDutiesLiteral = JSON.stringify(DUTIES);
const newSrc = src.replace(match[0], `export let DUTIES =${newDutiesLiteral};`);
fs.writeFileSync(rosterJsPath, newSrc);
console.log(`src/lib/roster.js: fixed ${jsFixed} entries (expected 80)`);
```

Run it from the repo root: `node fix-z1-saturday.js`

Expected output:
```
public/roster-data.json: fixed 80 entries (expected 80)
src/lib/roster.js: fixed 80 entries (expected 80)
```

If either count is not exactly 80, STOP and report BLOCKED — do not proceed to Step 2 with a partial fix.

- [ ] **Step 2: Verify zero gaps remain**

Run this audit (same shape as the one that originally found the 80 gaps):

```bash
node -e '
const fs = require("fs");
const src = fs.readFileSync("src/lib/roster.js", "utf8");
const m = src.match(/export let DUTIES\s*=(\[.*?\]);/s);
const DUTIES = eval(m[1]);
const gaps = DUTIES.filter(d => !/^\d+$/.test(d.d2));
console.log("total duties:", DUTIES.length);
console.log("remaining gaps:", gaps.length);
if (gaps.length > 0) console.log(gaps.slice(0,5));
'
```

Expected output: `total duties: 390` and `remaining gaps: 0`.

Then run the same check against `public/roster-data.json`:

```bash
node -e '
const data = require("./public/roster-data.json");
const gaps = data.duties.filter(d => !/^\d+$/.test(d.d2));
console.log("total duties:", data.duties.length);
console.log("remaining gaps:", gaps.length);
if (gaps.length > 0) console.log(gaps.slice(0,5));
'
```

Expected output: `total duties: 390` and `remaining gaps: 0`.

- [ ] **Step 3: Spot-check three corrected entries against the source PDF's Saturday BOGEY row by eye**

Confirm these three exact values in the fixed `src/lib/roster.js` (or `public/roster-data.json` — both were fixed identically):
- `SZ1/1X`, Saturday → `d2: "005071"` (PDF: `"DUTY 71 (1X)"`)
- `SZ1/17X`, Saturday → `d2: "005087"` (PDF: `"DUTY 87 (17X)"`)
- `SZ1/40`, Saturday → `d2: "005040"` (PDF: plain `"DUTY 40"`, LATE row)

- [ ] **Step 4: Run the full test suite and build**

Run: `npx vitest run`
Expected: PASS, same test count as before this task (this task adds no tests — Task 2 adds the `dutyNumber` tests).

Run: `npx vite build`
Expected: builds clean, no errors.

- [ ] **Step 5: Delete the temporary fix script**

The `fix-z1-saturday.js` file used in Step 1 must not be committed — delete it (or confirm it was created outside the repo and never staged).

- [ ] **Step 6: Commit**

```bash
git add public/roster-data.json src/lib/roster.js
git commit -m "Fix missing duty numbers for 80 Zone 1 Saturday duties"
```

---

### Task 2: `dutyNumber` pure helper + unit tests

**Files:**
- Modify: `src/lib/dutyMath.js` (add the new exported function alongside `fmtHrs`, `addDays`, etc.)
- Test: `src/lib/dutyMath.test.js` (existing test file for this module — add new tests using the same `describe`/`it`/`expect` pattern already used there)

**Interfaces:**
- Consumes: nothing new — reads only its own string argument.
- Produces: `export function dutyNumber(code)` — takes a `d2` value (from a `DUTIES` catalog entry) or a `shift.duty` value (from a saved shift — same kind of value, copied at log time). Returns a `string` (the real duty number, no leading zeros) or `null`. Task 3's four UI call sites all call this directly with no other shape expected.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/dutyMath.test.js` (this file already imports `describe, it, expect` from `"vitest"` — add `dutyNumber` to its existing import from `"./dutyMath.js"`):

```javascript
describe("dutyNumber", () => {
  it("strips leading zeros from a 6-digit code", () => {
    expect(dutyNumber("005068")).toBe("68");
    expect(dutyNumber("005001")).toBe("1");
  });
  it("passes through an already-3-digit code unchanged", () => {
    expect(dutyNumber("201")).toBe("201");
    expect(dutyNumber("101")).toBe("101");
  });
  it("returns null for non-numeric shift.duty values (spare, fixed types)", () => {
    expect(dutyNumber("spare")).toBe(null);
    expect(dutyNumber("cpc")).toBe(null);
  });
  it("returns null for the pre-fix data-gap shape (d2 duplicating the roster label)", () => {
    expect(dutyNumber("SZ1/01")).toBe(null);
    expect(dutyNumber("SZ1/1X")).toBe(null);
  });
  it("returns null for null, undefined, or empty string", () => {
    expect(dutyNumber(null)).toBe(null);
    expect(dutyNumber(undefined)).toBe(null);
    expect(dutyNumber("")).toBe(null);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/dutyMath.test.js`
Expected: FAIL — `dutyNumber is not a function` (or similar), since it doesn't exist in `dutyMath.js` yet.

- [ ] **Step 3: Implement `dutyNumber` in `src/lib/dutyMath.js`**

Add this near the other small formatting helpers (e.g. right after `fmtHrs`):

```javascript
// Every DUTIES catalog entry's `d2` (and a saved shift's `duty`, copied from
// it at log time - see LogScreen.jsx's shiftFields()) already carries the
// real duty number a driver keys into the in-cab machine, but only as an
// internal SEQ-table lookup key. This extracts the driver-facing number:
// the last 3 characters, leading zeros stripped. Returns null for anything
// non-numeric (Spare, CPC/Training's fixedType key, or a data gap where d2
// duplicates the roster label) - callers render nothing in that case.
export function dutyNumber(code) {
  if (!code || !/^\d+$/.test(code)) return null;
  return String(parseInt(code.slice(-3), 10));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/dutyMath.test.js`
Expected: PASS, all `dutyNumber` tests green alongside the existing ones in this file.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS, all test files green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dutyMath.js src/lib/dutyMath.test.js
git commit -m "Add dutyNumber: extracts the driver-facing duty number from d2/shift.duty"
```

---

### Task 3: Display the Duty No. tag in four places

**Files:**
- Modify: `src/screens/HomeScreen.jsx` (`TodayDutyCard`, ~line 36)
- Modify: `src/screens/DutyLookup.jsx` (duty summary strip, ~line 115)
- Modify: `src/screens/PeriodScreen.jsx` (logged-entry tag row, ~line 122)
- Modify: `src/lib/pdfExport.js` (per-shift card, ~line 44)

**Interfaces:**
- Consumes: `dutyNumber(code)` from Task 2 (`src/lib/dutyMath.js`), returns `string | null`.
- Produces: no new exports — this task only adds rendering, nothing later depends on it.

Line numbers below are approximate (files may have shifted slightly since this plan was written) — match by the surrounding code shown, not the exact number.

- [ ] **Step 1: `HomeScreen.jsx` — Today's/Tomorrow's Duty card**

Find the import line for `dutyMath.js` near the top of the file (currently something like):

```javascript
import { MAX_HOURS, MAX_SUNDAY, getDayType, addDays, fmtShort, fmtHrs, today, calcSpreadover, greetingTimeBand } from "../lib/dutyMath.js";
```

Add `dutyNumber` to it.

Find this line inside `TodayDutyCard` (the roster-number line):

```javascript
            <p style={{color:TEXT,fontSize:28,fontWeight:800,margin:0,letterSpacing:"-1px"}}>{shift.roster}</p>
```

Add a `dutyNo` line right after it (`shift` is already this component's prop, already used elsewhere in the same function for `getSeq(shift.zone, getDayType(shift.date), shift.duty||shift.roster)`):

```javascript
            <p style={{color:TEXT,fontSize:28,fontWeight:800,margin:0,letterSpacing:"-1px"}}>{shift.roster}</p>
            {dutyNumber(shift.duty) && <p style={{color:MUTED,fontSize:12,margin:"2px 0 0",fontWeight:600}}>Duty No. {dutyNumber(shift.duty)}</p>}
```

- [ ] **Step 2: `DutyLookup.jsx` — duty summary strip**

Add `dutyNumber` to this file's existing import from `"../lib/dutyMath.js"`.

Find this line (the duty-code header in the summary strip):

```javascript
                <span style={{color:ACCENT,fontSize:24,fontWeight:800,letterSpacing:"-0.5px"}}>{duty.r}</span>
```

This line sits inside a flex row (it's followed by a day-type badge span). Add the Duty No. tag right after that existing badge span, still inside the same flex row, using `duty.d2` (the catalog entry's own field, not `shift.duty` — there's no logged shift yet on this screen):

```javascript
                <span style={{color:ACCENT,fontSize:24,fontWeight:800,letterSpacing:"-0.5px"}}>{duty.r}</span>
                {/* existing day-type badge span stays exactly as-is */}
                {dutyNumber(duty.d2) && <span style={{color:MUTED,fontSize:12,fontWeight:600,marginLeft:"auto"}}>Duty No. {dutyNumber(duty.d2)}</span>}
```

(Read the actual surrounding JSX first — the day-type badge span between `duty.r` and where this new span goes must stay untouched; insert the new span as an added sibling, not a replacement.)

- [ ] **Step 3: `PeriodScreen.jsx` — logged-entry tag row**

Add `dutyNumber` to this file's existing import from `"../lib/dutyMath.js"`.

Find the existing tag row (currently ends with the overtime tag):

```javascript
                        {item.overtimeHours>0&&!item.isRestDay&&<span style={tag("#F59E0B")}>OT {fmtHrs(item.overtimeHours)}</span>}
```

Add the Duty No. tag as one more sibling in this same row, using `item.duty` (the logged shift's own field):

```javascript
                        {item.overtimeHours>0&&!item.isRestDay&&<span style={tag("#F59E0B")}>OT {fmtHrs(item.overtimeHours)}</span>}
                        {dutyNumber(item.duty) && <span style={tag(MUTED)}>Duty No. {dutyNumber(item.duty)}</span>}
```

(`tag` and `MUTED` are already imported/used elsewhere in this file for the other tags in this same row.)

- [ ] **Step 4: `pdfExport.js` — per-shift card**

Add `dutyNumber` to this file's existing import from `"./dutyMath.js"`.

Find this line (the roster-code header in each shift's card):

```javascript
            <div style="font-size:12px;font-weight:700;color:#1e3a5f">${tags}${item.roster}</div>
```

Change it to append the duty number when present (this file builds raw HTML strings, not JSX — use a template-literal conditional, matching the existing `tags`/`otLine`/`notesLine` conditional-string pattern already used just above and below this line):

```javascript
            <div style="font-size:12px;font-weight:700;color:#1e3a5f">${tags}${item.roster}${dutyNumber(item.duty) ? ` <span style="color:#6b7280;font-weight:400">· Duty No. ${dutyNumber(item.duty)}</span>` : ""}</div>
```

- [ ] **Step 5: Build to verify no errors**

Run: `npx vite build`
Expected: builds clean, no import/reference errors.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS, same count as after Task 2 (this task adds no tests — pure UI/HTML-string wiring calling an already-tested function).

- [ ] **Step 7: Manual verification note**

This app requires a real Supabase login — no test account is available in this environment. After building, note in your report that the four call sites were verified by static reading only (confirm each renders `null`/nothing when `dutyNumber` returns `null`, and the tag text/placement matches the plan), not by a live click-through. Do not claim a live check happened if it didn't.

- [ ] **Step 8: Commit**

```bash
git add src/screens/HomeScreen.jsx src/screens/DutyLookup.jsx src/screens/PeriodScreen.jsx src/lib/pdfExport.js
git commit -m "Show Duty No. tag on Home, Duty Lookup, Period screen, and PDF export"
```
