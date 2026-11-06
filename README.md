# Roster Buddy

Shift, hours and leave tracker for Dublin Bus Summerhill drivers — live at [www.rosterbuddy.ie](https://www.rosterbuddy.ie).

Log duties and leave, track the 5-week period limits (190h 4m total, 14h 30m Sunday, overtime), look up any duty's running board, share a duty to WhatsApp, get break reminders, and earn badges along the way. Accounts sync across phones.

## Stack

- React 19 + Vite, installable as a PWA (`public/manifest.webmanifest`, `public/sw.js`)
- Supabase: auth, synced app data, push subscriptions, and the `send-reminders` Edge Function (`supabase/functions/`)
- Roster data: `public/roster-data.json`, garage-keyed (`{ "Summerhill": { duties, seq, fixedRestPattern } }`)

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```

## Deploy

See [`docs/DEPLOY-RUNBOOK.md`](docs/DEPLOY-RUNBOOK.md). The site is published to Netlify (project `db-shift-tracker`) by uploading `dist/`.

**Heads-up:** the app and the reminder function read `public/roster-data.json` straight from this repo's `main` branch, so anything pushed to `main` that changes that file is live immediately. Check both readers before changing its shape.
