// Customer-facing chat experience with Firestore persistence and realtime updates.
const guestId = getGuestId();

function dismissLoader() {
  const loader = document.querySelector('.loader');
  if (!loader) return;
  window.setTimeout(() => {
    loader.classList.add('is-hidden');
    window.setTimeout(() => loader.remove(), 500);
  }, 650);
}

dismissLoader();

function setupCustomerChat() {
  const launchButton = document.getElementById('launch-support');
  const supportShell = document.getElementById('support-shell');
  const closeButton = document.getElementById('close-support');
  const messagesEl = document.getElementById('support-messages');
  const inputEl = document.getElementById('support-input');
  const sendButton = document.getElementById('support-send');
  const typingEl = document.getElementById('support-typing');
  const emojiButton = document.getElementById('emoji-btn');
  const chatPageMessages = document.getElementById('chat-messages');
  const chatPageInput = document.getElementById('chat-input');
  const chatPageSend = document.getElementById('chat-send');
  const chatPageTyping = document.getElementById('chat-typing');
  const chatPageEmoji = document.getElementById('chat-emoji-btn');
  const guestDisplay = document.getElementById('guest-id-display');
  const userProfileEl = document.getElementById('user-profile');

  if (guestDisplay) guestDisplay.textContent = guestId;

  const scrollToBottom = (container) => {
    if (container) container.scrollTop = container.scrollHeight;
  };

  const renderMessages = (container, data) => {
    if (!container) return;
    container.innerHTML = '';
    data.forEach((item) => {
      const sender = item.sender || item.sender_type || 'customer';
      const bubble = document.createElement('div');
      bubble.className = `message ${sender === 'customer' ? 'customer' : 'admin'}`;
      bubble.innerHTML = `
        <div>${item.message || item.content}</div>
        <div class="message-meta">
          <span>${formatTime(item.timestamp || item.created_at)}</span>
          <span>${item.read ? 'Seen' : sender === 'customer' ? 'Sent' : 'Delivered'}</span>
        </div>
      `;
      container.appendChild(bubble);
    });
    scrollToBottom(container);
  };

  const renderProfile = (user) => {
    if (!userProfileEl) return;
    if (!user) {
      userProfileEl.style.display = 'none';
      return;
    }

    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const email = user.email;
    const role = user.user_metadata?.role || 'customer';

    userProfileEl.style.display = 'block';
    userProfileEl.innerHTML = `
      <div class="profile-card">
        <h4>${name}</h4>
        <p>${email}</p>
        <p class="muted">${role === 'admin' ? 'Administrator' : 'Customer'}</p>
      </div>
    `;
  };

  const listenForMessages = (container, typingContainer) => {
    const unsubscribe = subscribeToGuestMessages(guestId, (messages) => {
      renderMessages(container, messages);
      const lastMessage = messages[messages.length - 1];
      const lastSender = lastMessage?.sender || lastMessage?.sender_type;
      if (lastSender === 'admin' && !lastMessage.read) {
        markMessagesRead(guestId, messages.filter((item) => (item.sender || item.sender_type) === 'admin' && !item.read).map((item) => item.id));
      }
      if (typingContainer) typingContainer.textContent = '';
    });
    return unsubscribe;
  };

  const sendMessage = (inputEl, container, typingContainer) => {
    const value = inputEl.value.trim();
    if (!value) return;
    const payload = {
      guestId,
      sender: 'customer',
      message: value,
      timestamp: new Date(),
      read: false,
      user: undefined
    };

    const finishSend = () => {
      sendChatMessage(payload).then(() => {
        inputEl.value = '';
        showToast('Message sent');
        if (container) scrollToBottom(container);
        if (typingContainer) typingContainer.textContent = 'Support is reviewing your message…';
      });
    };

    if (window.GiwuAuth) {
      window.GiwuAuth.getUser().then((u) => {
        if (u) {
          payload.user = { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email };
          renderProfile(u);
        }
        finishSend();
      }).catch(() => finishSend());
    } else finishSend();
  };

  const openSupport = () => {
    // Only open the floating widget if the element exists; otherwise fall back to the full chat page
    console.log('[chat] openSupport called', { supportShell: !!supportShell });
    if (!supportShell) {
      console.warn('[chat] support shell missing — falling back to chat.html');
      window.location.href = 'chat.html';
      return;
    }
    // ensure visible at layout level
    supportShell.style.display = 'grid';
    supportShell.classList.add('is-open');
    supportShell.setAttribute('aria-hidden', 'false');
    // toggle body helper class so CSS can hide the floating button
    document.body.classList.add('support-open');
    // focus the input in the popup for quick typing
    window.setTimeout(() => inputEl?.focus(), 120);
    // runtime safety: if the popup remains hidden (CSS/positioning issue), fallback to chat page
    window.setTimeout(() => {
      try {
        const win = supportShell.querySelector('.support-window');
        const style = win && window.getComputedStyle(win);
        const rect = supportShell.getBoundingClientRect();
        if (!win || !style || rect.width === 0 || style.opacity === '0') {
          console.warn('[chat] support window did not appear — falling back to chat.html');
          window.location.href = 'chat.html';
        }
      } catch (e) {
        console.warn('[chat] fallback check error', e);
      }
    }, 380);
  };

  const closeSupport = () => {
    console.log('[chat] closeSupport called');
    if (supportShell) {
      supportShell.classList.remove('is-open');
      supportShell.setAttribute('aria-hidden', 'true');
      // hide after animation
      window.setTimeout(() => { try { supportShell.style.display = ''; } catch(e){} }, 260);
    }
    document.body.classList.remove('support-open');
  };

  // Toggle support popup from the floating button
  launchButton?.addEventListener('click', (ev) => {
    console.log('[chat] launch button clicked');
    // If the shell isn't present, open the full chat page as a graceful fallback
    if (!supportShell) { window.location.href = 'chat.html'; return; }
    const isOpen = supportShell.classList.contains('is-open');
    if (isOpen) {
      closeSupport();
      launchButton?.setAttribute('aria-expanded', 'false');
    } else {
      openSupport();
      launchButton?.setAttribute('aria-expanded', 'true');
    }
  });
  closeButton?.addEventListener('click', closeSupport);
  supportShell?.addEventListener('click', (event) => {
    if (event.target === supportShell) closeSupport();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && supportShell?.classList.contains('is-open')) {
      closeSupport();
      launchButton?.setAttribute('aria-expanded', 'false');
    }
  });

  inputEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage(inputEl, messagesEl, typingEl);
  });
  chatPageInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendMessage(chatPageInput, chatPageMessages, chatPageTyping);
  });

  sendButton?.addEventListener('click', () => sendMessage(inputEl, messagesEl, typingEl));
  chatPageSend?.addEventListener('click', () => sendMessage(chatPageInput, chatPageMessages, chatPageTyping));

  emojiButton?.addEventListener('click', () => {
    inputEl.value += '😊';
    inputEl.focus();
  });
  chatPageEmoji?.addEventListener('click', () => {
    chatPageInput.value += '😊';
    chatPageInput.focus();
  });

  if (window.GiwuAuth) {
    window.GiwuAuth.getUser().then((user) => renderProfile(user)).catch(() => renderProfile(null));
  } else {
    renderProfile(null);
  }

  if (messagesEl) listenForMessages(messagesEl, typingEl);
  if (chatPageMessages) listenForMessages(chatPageMessages, chatPageTyping);
}

setupCustomerChat();
