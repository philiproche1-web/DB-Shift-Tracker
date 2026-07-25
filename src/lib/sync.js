// Whole-document last-write-wins conflict resolution: given the local and
// remote updated_at timestamps for one synced table, decide which document
// should win. Ties favor local (a device mid-sync with a genuinely
// simultaneous remote write is rare, and favoring local avoids discarding
// a change the current device just made).
export function pickWinner(localUpdatedAt, remoteUpdatedAt) {
  if (!remoteUpdatedAt) return "local";
  if (!localUpdatedAt) return "remote";
  return new Date(localUpdatedAt).getTime() >= new Date(remoteUpdatedAt).getTime()
    ? "local"
    : "remote";
}

const SYNC_META_KEY = "dbus_sync_meta";

function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch {}
}

// Called whenever the app writes app_data/leave_settings/settings locally,
// so the next sync pass knows this table has a pending local change to push.
export function markDirty(table) {
  const meta = loadSyncMeta();
  meta[table] = { ...(meta[table] || {}), dirty: true, updatedAt: new Date().toISOString() };
  saveSyncMeta(meta);
}

// Reconciles one table's local copy against its remote row: pushes local if
// local is dirty and wins, pulls remote if remote wins, or does nothing if
// neither applies. A failed push/pull leaves the dirty flag untouched so the
// next sync attempt retries it — nothing is ever silently dropped.
export async function syncTable(supabase, table, { load, save }, userId) {
  const meta = loadSyncMeta();
  const local = meta[table] || {};

  const { data: remoteRow, error: fetchError } = await supabase
    .from(table)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError };

  const winner = pickWinner(local.updatedAt, remoteRow?.updated_at);

  if (winner === "local" && local.dirty) {
    let localData;
    try {
      localData = await load();
    } catch (error) {
      return { ok: false, error };
    }
    const { data: pushedRow, error: pushError } = await supabase
      .from(table)
      .upsert({ user_id: userId, data: localData, updated_at: local.updatedAt })
      .select("updated_at")
      .single();
    if (pushError) return { ok: false, error: pushError };
    // The server (via a trigger) overwrites whatever updated_at we sent with
    // its own clock, so every device's future comparisons key off one clock
    // instead of each device's own — this is what pickWinner compares next
    // time, not the client-supplied value above.
    const syncedAt = pushedRow?.updated_at ?? local.updatedAt;
    // Compare-and-swap: only clear the dirty flag if no newer edit landed
    // (via markDirty) while the push was in flight. If one did, the meta
    // entry's updatedAt will have moved past our stale snapshot, so leave
    // it untouched — still dirty — for the next sync pass to pick up.
    const freshMeta = loadSyncMeta();
    if ((freshMeta[table] || {}).updatedAt === local.updatedAt) {
      saveSyncMeta({ ...freshMeta, [table]: { dirty: false, updatedAt: syncedAt } });
    }
    return { ok: true, direction: "pushed" };
  }

  if (winner === "remote" && remoteRow) {
    try {
      await save(remoteRow.data);
    } catch (error) {
      return { ok: false, error };
    }
    // Same compare-and-swap guard as the push branch above.
    const freshMeta = loadSyncMeta();
    if ((freshMeta[table] || {}).updatedAt === local.updatedAt) {
      saveSyncMeta({ ...freshMeta, [table]: { dirty: false, updatedAt: remoteRow.updated_at } });
    }
    return { ok: true, direction: "pulled" };
  }

  return { ok: true, direction: "none" };
}

// Runs syncTable for every configured table. Called on login, on first
// migration, on 'online', and when the app returns to the foreground.
export async function syncAll(supabase, userId, tableConfigs) {
  const results = {};
  for (const { table, load, save } of tableConfigs) {
    results[table] = await syncTable(supabase, table, { load, save }, userId);
  }
  return results;
}

// On a driver's first successful login, pushes whatever already exists in
// local storage up as each table's initial row — but only if that table has
// no remote row yet, so a second device logging in later never clobbers
// history the first device already migrated.
export async function migrateLocalDataIfNeeded(supabase, userId, tableConfigs) {
  const results = {};
  for (const { table, load } of tableConfigs) {
    const { data: remoteRow, error: fetchError } = await supabase
      .from(table)
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      results[table] = { ok: false, error: fetchError };
      continue;
    }
    if (remoteRow) {
      results[table] = { ok: true, migrated: false };
      continue;
    }

    const localData = await load();
    const updatedAt = new Date().toISOString();
    const { data: insertedRow, error: insertError } = await supabase
      .from(table)
      .insert({ user_id: userId, data: localData, updated_at: updatedAt })
      .select("updated_at")
      .single();

    if (insertError) {
      results[table] = { ok: false, error: insertError };
      continue;
    }

    const meta = loadSyncMeta();
    meta[table] = { dirty: false, updatedAt: insertedRow?.updated_at ?? updatedAt };
    saveSyncMeta(meta);
    results[table] = { ok: true, migrated: true };
  }
  return results;
}
