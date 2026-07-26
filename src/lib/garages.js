// Canonical garage list. Free text at signup meant two drivers typing the
// same garage differently would silently end up ungrouped — this is the
// fixed list every garage picker and every garage-scoped query should use.
export const GARAGES = [
  "Summerhill",
  "Donnybrook",
  "Clontarf",
  "Phibsborough",
  "Ringsend",
  "Conyngham Road",
  "Harristown",
  "Jamestown",
];

// Zone 1, Zone 2, Skerries and 150 (the bundled DUTIES roster) belong to
// Summerhill only. Every other garage is registered so drivers can sign up,
// but has no roster loaded yet — hasLiveRoster() is what gates the app to a
// "coming soon" screen for them instead of showing Summerhill's duties.
export const GARAGES_WITH_ROSTER = ["Summerhill"];

export function hasLiveRoster(garage) {
  return GARAGES_WITH_ROSTER.includes(garage);
}

// Shared shape for any garage <select> — signup and the Settings "change
// garage" picker both need the same thing: every garage listed, but the
// ones with no roster yet shown as disabled/"coming soon" rather than
// hidden, so it's clear more garages are on the way.
export function garageOptions() {
  return GARAGES.map((g) => ({
    value: g,
    label: hasLiveRoster(g) ? g : `${g} — coming soon`,
    disabled: !hasLiveRoster(g),
  }));
}
