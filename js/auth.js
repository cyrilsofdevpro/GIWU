// Supabase auth wrappers for GiwuLogStore.
let supabaseAuthClient = null;

function initSupabaseAuth() {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.warn('Supabase auth not initialized: missing config');
    return;
  }
  supabaseAuthClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

async function ensureProfile(user) {
  if (!supabaseAuthClient || !user?.id) return;

  const { data: existing, error: existingError } = await supabaseAuthClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingError) {
    console.warn('Error checking profile existence:', existingError.message || existingError);
    return;
  }

  if (existing) return;

  const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
  const role = user.user_metadata?.role || 'customer';
  const { error } = await supabaseAuthClient.from('profiles').insert({
    id: user.id,
    full_name: displayName,
    role
  });

  if (error) console.warn('Error creating profile:', error.message || error);
}

async function signup(email, password, displayName) {
  if (!supabaseAuthClient) throw new Error('Supabase client is not initialized');
  const { data, error } = await supabaseAuthClient.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName, role: 'customer' }
    }
  });
  if (error) throw error;
  if (data?.user) await ensureProfile(data.user);
  return data;
}

async function login(email, password) {
  if (!supabaseAuthClient) throw new Error('Supabase client is not initialized');
  const { data, error } = await supabaseAuthClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data?.user) await ensureProfile(data.user);
  return data;
}

async function logout() {
  if (!supabaseAuthClient) return;
  await supabaseAuthClient.auth.signOut();
}

async function getUser() {
  if (!supabaseAuthClient) return null;
  const { data, error } = await supabaseAuthClient.auth.getUser();
  if (error) return null;
  return data.user;
}

async function getSession() {
  if (!supabaseAuthClient) return null;
  const { data, error } = await supabaseAuthClient.auth.getSession();
  if (error) return null;
  return data.session;
}

async function getProfile() {
  if (!supabaseAuthClient) return null;
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabaseAuthClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data;
}

async function getToken() {
  const session = await getSession();
  return session?.access_token || null;
}

async function isAdmin() {
  const user = await getUser();
  if (!user) return false;
  const metadataRole = user.user_metadata?.role;
  return user.email === 'admin@giwu.com' || metadataRole === 'admin';
}

initSupabaseAuth();

window.GiwuAuth = { signup, login, logout, getUser, getSession, getProfile, getToken, isAdmin, ensureProfile };
