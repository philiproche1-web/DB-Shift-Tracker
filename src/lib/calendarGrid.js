// Pure month-grid maths for the in-app CalendarPicker (src/components/shared.jsx).
//
// The app used to rely on the phone's native <input type="date"> picker.
// On Android with a larger display/font size that native dialog overflows
// the screen — the Sunday column and the OK button get cut off — and a web
// page has no way to resize an OS dialog. So dates are now picked from our
// own calendar, which is built from this grid.
//
// Everything works on "YYYY-MM-DD" strings built by hand from y/m/d parts,
// never via toISOString(), so a date can't shift by a day across a timezone
// or DST boundary.

const pad = (n) => String(n).padStart(2, "0");

export function isoDate(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function parseIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}

// Shift a {year, monthIndex} by n months, wrapping the year.
export function addMonths({ year, monthIndex }, n) {
  const total = year * 12 + monthIndex + n;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
}

// Weeks for one month, Monday first (Irish convention, same as the phone's
// own picker drivers are used to). Each week is 7 cells; cells outside the
// month are null so the grid keeps its shape.
export function monthGrid(year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // getDay(): 0=Sun..6=Sat → Monday-first offset 0..6
  const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(isoDate(year, monthIndex, d));
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
