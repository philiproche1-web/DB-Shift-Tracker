import { useEffect, useRef, useState } from "react";
import { BG, CARD, CARD2, BORDER, TEXT, MUTED, ACCENT, btnStyle } from "../lib/theme.js";

const FAQ_CATEGORIES = [
  {
    key: "start",
    label: "Getting Started",
    items: [
      { q: "How do I sign up?", a: "Enter your email, a password (8+ characters), your first name, driver number and garage. Right now only Summerhill has live duty data — other garages show a \"coming soon\" screen until their roster is added." },
      { q: "Can I use the app on more than one phone?", a: "Yes. Log in with the same email and password on any device — your shifts, leave and settings all belong to your account, not to one phone." },
      { q: "My garage isn't Summerhill — why can't I see any duties?", a: "Only Summerhill has a live roster loaded so far. Other garages are coming — you'll see a \"coming soon\" screen until yours is ready." },
      { q: "Can I change my garage or name later?", a: "Yes — Settings has a \"Change\" option next to both Name and Garage." },
    ],
  },
  {
    key: "logging",
    label: "Logging Shifts",
    items: [
      { q: "How does the app know my Work and Relief hours?", a: "They fill in automatically from the duty you pick. If your day ran differently, just adjust the numbers — they're editable." },
      { q: "What's the difference between the Duty type buttons?", a: "Duty is a normal roster duty from Lookup or the picker. CPC/Training, Standard Spare and Workout Spare are fixed-duration entries — enter a start time and the finish is worked out for you." },
      { q: "I'm covering as a spare — which one do I pick?", a: "Standard Spare (7h40 including a break) or Workout Spare (5h30, no break), from the Duty type buttons." },
      { q: "Can I log the same duty on more than one day at once?", a: "Yes — once you've picked a duty, \"Also log this duty on\" lets you tick off extra days in the same week." },
      { q: "I already logged something for that date — what happens if I log again?", a: "The app asks you to confirm before overwriting — it won't silently block you or create a duplicate." },
    ],
  },
  {
    key: "compliance",
    label: "Hours & Compliance",
    items: [
      { q: "What are the three limits tracked?", a: "Total hours (190h 4m), Sunday hours (14h 30m), and Overtime — tracked separately, and overtime doesn't count toward the 190h limit." },
      { q: "I'm working on a scheduled rest day — does it count toward my 190h?", a: "No. Toggle \"Working on a rest day\" under More options — those hours all count as overtime instead." },
      { q: "How do I log overtime on top of a normal shift?", a: "Under More options, enter the extra hours and an optional note — it's tracked separately from your 190h total." },
      { q: "How do I get a record to show a union rep or manager?", a: "Period screen → Export PDF — a full record of shifts, compliance figures and overtime notes." },
    ],
  },
  {
    key: "alerts",
    label: "Route Alerts",
    items: [
      { q: "What are the alert banners on Home, Log and Lookup?", a: "Diversions, roadworks or other notices that match your garage, zone and dates." },
      { q: "Who posts these alerts?", a: "Your depot admin. There's no in-app reporting yet — it's just a heads-up when one applies to you." },
    ],
  },
  {
    key: "leave",
    label: "Leave & Time Off",
    items: [
      { q: "How many annual leave days do I get?", a: "Set in Settings (defaults to 20/year) — edit it if your entitlement is different." },
      { q: "How does Self Cert work?", a: "2 days per half-year (Jan–Jun and Jul–Dec), resetting automatically at the start of each half." },
      { q: "Does a logged day off count toward my 190h limit?", a: "No — the hours limits only track worked shifts, not Annual Leave, Sick Days, Self Cert or Force Majeure." },
    ],
  },
  {
    key: "account",
    label: "Account & Data",
    items: [
      { q: "Who can see my data?", a: "Only you — your shifts and leave are scoped to your account at the database level." },
      { q: "Is my data safe if I change phones?", a: "Yes — once you're logged in, your data lives on your account, not just the phone. Log in on the new one and it's all there." },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <p style={{ color: TEXT, fontSize:"0.875rem", fontWeight: 600, margin: 0 }}>{q}</p>
        <span style={{ color: MUTED, fontSize:"1rem", flexShrink: 0, lineHeight: 1 }}>{open ? "−" : "+"}</span>
      </div>
      {open && <p style={{ color: MUTED, fontSize:"0.8125rem", lineHeight: 1.6, margin: "0 16px 14px" }}>{a}</p>}
    </div>
  );
}

// initialCategory: when a driver lands here from a contextual link (e.g. Period's
// "Hours & Compliance" or Leave's "Leave & Time Off"), scroll straight to that
// section instead of making them hunt through the whole list.
export function FAQScreen({ onClose, initialCategory }) {
  const sectionRefs = useRef({});

  useEffect(() => {
    if (initialCategory && sectionRefs.current[initialCategory]) {
      sectionRefs.current[initialCategory].scrollIntoView({ block: "start" });
    }
  }, [initialCategory]);

  return (
    <div style={{ background: BG, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "32px 20px 16px", background: `linear-gradient(180deg,${CARD2} 0%,${BG} 100%)` }}>
        <p style={{ color: ACCENT, fontSize:"0.6875rem", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, margin: "0 0 6px" }}>Reference</p>
        <h1 style={{ color: TEXT, fontSize:"1.5rem", fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" }}>FAQ</h1>
        <p style={{ color: MUTED, fontSize:"0.8125rem", margin: 0 }}>Common questions from drivers new to the app</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 16px" }}>
        {FAQ_CATEGORIES.map(cat => (
          <div key={cat.key} ref={el => (sectionRefs.current[cat.key] = el)} style={{ marginBottom: 20 }}>
            <p style={{ color: MUTED, fontSize:"0.6875rem", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, margin: "0 0 10px" }}>{cat.label}</p>
            {cat.items.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
          </div>
        ))}
        <button onClick={onClose} style={{ ...btnStyle, marginBottom: 32 }}>Close</button>
      </div>
    </div>
  );
}
