export function signUp(supabase, { email, password, driverNumber, garage, firstName }) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { driver_number: driverNumber, garage, first_name: firstName },
      emailRedirectTo: window.location.origin,
    },
  });
}

// Driver numbers are unique company-wide. RLS blocks a driver from seeing
// any other driver's profile row, so this can't be answered with a plain
// select — it goes through a security-definer RPC that reveals only
// whether the number is taken, never whose it is.
export async function isDriverNumberTaken(supabase, driverNumber) {
  const { data, error } = await supabase.rpc("is_driver_number_taken", { p_driver_number: driverNumber.trim() });
  if (error) return false; // fail open — the DB unique constraint is the real backstop
  return !!data;
}

export function signIn(supabase, { email, password }) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signOut(supabase) {
  return supabase.auth.signOut();
}

export function getSession(supabase) {
  return supabase.auth.getSession();
}

export function onAuthStateChange(supabase, callback) {
  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
}

export function resetPasswordForEmail(supabase, email) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
}

export function updatePassword(supabase, password) {
  return supabase.auth.updateUser({ password });
}
