// Supabase-based chat helpers with fallback support for local preview.
let supabaseClient = null;
let useFallback = false;
let fallbackMessages = [];
let adminAuthed = false;
let guestSubscription = null;
let allMessagesSubscription = null;

function initSupabase() {
  try {
    if (!window.supabase || !supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase SDK or config missing');
    }
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    useFallback = false;
    loadFallbackMessages();
  } catch (error) {
    console.info('Using local fallback chat storage:', error.message);
    useFallback = true;
    loadFallbackMessages();
  }
}

function getGuestId() {
  const stored = localStorage.getItem('giwu-guest-id');
  if (stored) return stored;
  const generated = `Giwu-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem('giwu-guest-id', generated);
  return generated;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toISOString ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function persistFallbackMessages() {
  localStorage.setItem('giwu-chat-messages', JSON.stringify(fallbackMessages));
}

function loadFallbackMessages() {
  const stored = localStorage.getItem('giwu-chat-messages');
  fallbackMessages = stored ? JSON.parse(stored) : [];
  return fallbackMessages;
}

async function getSupportSession(guestId, userId = null) {
  if (!supabaseClient) return null;

  const { data: existingSession, error: fetchError } = await supabaseClient
    .from('support_sessions')
    .select('*')
    .eq('guest_id', guestId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError) throw fetchError;

  if (existingSession) {
    if (userId && !existingSession.user_id) {
      const { error: updateError } = await supabaseClient
        .from('support_sessions')
        .update({ user_id: userId })
        .eq('id', existingSession.id);
      if (updateError) console.warn('Failed to link support session to user', updateError.message || updateError);
    }
    return existingSession;
  }

  const { data: newSession, error: insertError } = await supabaseClient
    .from('support_sessions')
    .insert({ guest_id: guestId, user_id: userId, subject: 'Customer support', status: 'open' })
    .select()
    .single();
  if (insertError) throw insertError;
  return newSession;
}

async function sendChatMessage(payload) {
  if (!useFallback && supabaseClient) {
    const session = await getSupportSession(payload.guestId, payload.user?.id);
    const message = {
      session_id: session?.id,
      guest_id: payload.guestId,
      sender_type: payload.sender,
      sender_id: payload.user?.id || null,
      sender_name: payload.user?.name || payload.user?.email || payload.guestId,
      content: payload.message,
      read: payload.read || false
    };
    const { data, error } = await supabaseClient.from('support_messages').insert(message).select().single();
    if (error) throw error;
    return data;
  }
  const record = { ...payload, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` };
  fallbackMessages.push(record);
  persistFallbackMessages();
  return Promise.resolve(record);
}

function subscribeToGuestMessages(guestId, callback) {
  if (!useFallback && supabaseClient) {
    let cancelled = false;
    supabaseClient.from('support_messages')
      .select('*')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) return console.error(error);
        if (!cancelled) callback(data || []);
      });

    const channel = supabaseClient.channel(`public:support_messages:guest:${guestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `guest_id=eq.${guestId}` }, async () => {
        if (cancelled) return;
        const { data, error } = await supabaseClient.from('support_messages').select('*').eq('guest_id', guestId).order('created_at', { ascending: true });
        if (error) return console.error(error);
        callback(data || []);
      })
      .subscribe();

    return () => { cancelled = true; supabaseClient.removeChannel(channel); };
  }

  const sync = () => {
    const messages = loadFallbackMessages().filter((item) => item.guestId === guestId);
    callback(messages);
  };
  sync();
  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
}

function subscribeToAllMessages(callback) {
  if (!useFallback && supabaseClient) {
    let cancelled = false;
    supabaseClient.from('support_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) return console.error(error);
        if (!cancelled) callback(data || []);
      });

    const channel = supabaseClient.channel('public:support_messages:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, async () => {
        if (cancelled) return;
        const { data, error } = await supabaseClient.from('support_messages').select('*').order('created_at', { ascending: false });
        if (error) return console.error(error);
        callback(data || []);
      })
      .subscribe();

    return () => { cancelled = true; supabaseClient.removeChannel(channel); };
  }

  const sync = () => {
    const messages = loadFallbackMessages();
    callback(messages);
  };
  sync();
  window.addEventListener('storage', sync);
  return () => window.removeEventListener('storage', sync);
}

async function markMessagesRead(guestId, ids) {
  if (!useFallback && supabaseClient) {
    const { error } = await supabaseClient.from('support_messages').update({ read: true }).in('id', ids);
    if (error) console.error(error);
    return;
  }

  fallbackMessages = fallbackMessages.map((message) => (message.guestId === guestId && ids.includes(message.id) ? { ...message, read: true } : message));
  persistFallbackMessages();
}

async function signInAdmin(email, password) {
  if (!useFallback && supabaseClient) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const session = data.session;
    adminAuthed = !!session;
    return data;
  }

  const allowed = email === 'admin@giwu.com' && password === 'admin123';
  adminAuthed = allowed;
  localStorage.setItem('giwu-admin-auth', allowed ? 'true' : 'false');
  return Promise.resolve({ user: allowed ? { email } : null });
}

function signOutAdmin() {
  if (!useFallback && supabaseClient) {
    return supabaseClient.auth.signOut();
  }
  adminAuthed = false;
  localStorage.setItem('giwu-admin-auth', 'false');
  return Promise.resolve();
}

function isAdminAuthenticated() {
  if (!useFallback && supabaseClient) {
    const session = supabaseClient.auth.getSession();
    return !!session?.data?.session;
  }
  return localStorage.getItem('giwu-admin-auth') === 'true' || adminAuthed;
}

initSupabase();
