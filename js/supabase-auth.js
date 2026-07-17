// Supabase auth helper. Requires @supabase/supabase-js and env.js loaded first.
let supabaseAuthClient = null;

function initSupabaseAuth() {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn('Supabase auth not initialized: missing config');
    return;
  }
  supabaseAuthClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

async function signup(email, password, displayName) {
  if (!supabaseAuthClient) throw new Error('Supabase client is not initialized');
  const { data, error } = await supabaseAuthClient.auth.signUp({ email, password }, { data: { full_name: displayName, role: 'customer' } });
  if (error) throw error;
  return data;
}

async function login(email, password) {
  if (!supabaseAuthClient) throw new Error('Supabase client is not initialized');
  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function logout() {
  if (!supabaseAuthClient) return;
  await supabaseAuthClient.auth.signOut();
}

async function getUser() {
  if (!supabaseAuthClient) return null;
  const { data } = await supabaseAuthClient.auth.getUser();
  return data.user;
}

function getSession() {
  if (!supabaseAuthClient) return null;
  return supabaseAuthClient.auth.getSession();
}

window.GiwuAuth = { initSupabaseAuth, signup, login, logout, getUser, getSession };
