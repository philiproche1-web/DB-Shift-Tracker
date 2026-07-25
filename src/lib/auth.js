export function signUp(supabase, { email, password, driverNumber, garage }) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { driver_number: driverNumber, garage },
      emailRedirectTo: window.location.origin,
    },
  });
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
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
