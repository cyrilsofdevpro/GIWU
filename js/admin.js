// Admin console for reading and replying to customer conversations.
let selectedGuestId = null;

function setupAdmin() {
  const customerListEl = document.getElementById('customer-list');
  const adminMessagesEl = document.getElementById('admin-messages');
  const adminInputEl = document.getElementById('admin-input');
  const adminSendButton = document.getElementById('admin-send');
  const activeGuestEl = document.getElementById('active-guest');
  const activeStatusEl = document.getElementById('active-status');
  const logoutButton = document.getElementById('admin-logout');
  const statsPanel = document.getElementById('admin-stats');

  const renderStats = ({ totalCustomers, totalMessages, unreadMessages, activeSessions }) => {
    if (!statsPanel) return;
    statsPanel.innerHTML = `
      <div class="stat-card">
        <span>Total customers</span>
        <strong>${totalCustomers}</strong>
      </div>
      <div class="stat-card">
        <span>Total messages</span>
        <strong>${totalMessages}</strong>
      </div>
      <div class="stat-card">
        <span>Unread messages</span>
        <strong>${unreadMessages}</strong>
      </div>
      <div class="stat-card">
        <span>Active sessions</span>
        <strong>${activeSessions}</strong>
      </div>
    `;
  };

  const renderMessages = (messages) => {
    if (!adminMessagesEl) return;
    adminMessagesEl.innerHTML = '';
    const senderName = messages[0]?.sender_name || messages[0]?.user?.name || messages[0]?.user?.email || 'Customer';
    const guestId = messages[0]?.guest_id || messages[0]?.guestId || '';
    const info = document.createElement('div');
    info.className = 'user-info';
    info.innerHTML = `<strong>${senderName}</strong> <small>${guestId}</small>`;
    adminMessagesEl.appendChild(info);

    messages.forEach((item) => {
      const sender = item.sender || item.sender_type || 'customer';
      const bubble = document.createElement('div');
      bubble.className = `message ${sender === 'admin' ? 'admin' : 'customer'}`;
      bubble.innerHTML = `
        <div>${item.message || item.content}</div>
        <div class="message-meta">
          <span>${formatTime(item.timestamp || item.created_at)}</span>
          <span>${sender === 'admin' ? 'Sent' : 'Received'}</span>
        </div>
      `;
      adminMessagesEl.appendChild(bubble);
    });
    adminMessagesEl.scrollTop = adminMessagesEl.scrollHeight;
  };

  const renderCustomers = (customers) => {
    if (!customerListEl) return;
    customerListEl.innerHTML = '';
    customers.forEach((customer) => {
      const card = document.createElement('div');
      card.className = `customer-card ${selectedGuestId === customer.guestId ? 'active' : ''}`;
      card.innerHTML = `
        <h4>${customer.user?.name || customer.guestId}</h4>
        <p class="muted">${customer.user?.email || customer.guestId}</p>
        <p>${customer.lastMessage || 'Start a conversation'}</p>
        <p>${customer.unreadCount ? `${customer.unreadCount} unread` : 'No unread messages'}</p>
      `;
      card.addEventListener('click', () => {
        selectedGuestId = customer.guestId;
        activeGuestEl.textContent = customer.user?.name || customer.guestId;
        activeStatusEl.textContent = 'Live conversation';
        renderCustomers(customers);
        listenToConversation(customer.guestId);
      });
      customerListEl.appendChild(card);
    });
  };

  const listenToConversation = (guestId) => {
    subscribeToGuestMessages(guestId, (messages) => {
      renderMessages(messages);
      const unreadMessages = messages.filter((item) => {
        const sender = item.sender || item.sender_type || 'customer';
        return sender === 'customer' && !item.read;
      });
      if (unreadMessages.length) markMessagesRead(guestId, unreadMessages.map((item) => item.id));
    });
  };

  const loadCustomers = () => {
    subscribeToAllMessages((messages) => {
      const grouped = {};
      let unreadMessages = 0;
      messages.forEach((item) => {
        const sender = item.sender || item.sender_type || 'customer';
        const guestId = item.guestId || item.guest_id || item.guest;
        if (!guestId) return;

        if (!grouped[guestId]) {
          grouped[guestId] = {
            guestId,
            lastMessage: item.message || item.content,
            unreadCount: 0,
            user: item.user,
            sessionIds: new Set()
          };
        }

        grouped[guestId].lastMessage = item.message || item.content;
        if (item.user) grouped[guestId].user = item.user;
        if ((sender === 'customer' || sender === 'guest') && !item.read) {
          grouped[guestId].unreadCount += 1;
          unreadMessages += 1;
        }
        if (item.session_id) grouped[guestId].sessionIds.add(item.session_id);
      });

      const customers = Object.values(grouped).map((customer) => ({
        guestId: customer.guestId,
        lastMessage: customer.lastMessage,
        unreadCount: customer.unreadCount,
        user: customer.user,
        sessionCount: customer.sessionIds.size
      }));

      const totalCustomers = customers.length;
      const totalMessages = messages.length;
      const activeSessions = customers.reduce((sum, customer) => sum + customer.sessionCount, 0);

      renderStats({ totalCustomers, totalMessages, unreadMessages, activeSessions });
      renderCustomers(customers);

      if (!selectedGuestId && customers.length) {
        selectedGuestId = customers[0].guestId;
        activeGuestEl.textContent = customers[0].user?.name || customers[0].guestId;
        activeStatusEl.textContent = 'Live conversation';
        listenToConversation(customers[0].guestId);
      }
    });
  };

  const sendAdminReply = () => {
    if (!selectedGuestId) return;
    const message = adminInputEl.value.trim();
    if (!message) return;
    sendChatMessage({
      guestId: selectedGuestId,
      sender: 'admin',
      message,
      timestamp: new Date(),
      read: false
    }).then(() => {
      adminInputEl.value = '';
      showToast('Admin reply sent');
    });
  };

  adminSendButton?.addEventListener('click', sendAdminReply);
  adminInputEl?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') sendAdminReply();
  });
  logoutButton?.addEventListener('click', () => {
    window.GiwuAuth.logout().then(() => {
      window.location.href = 'index.html';
    });
  });

  loadCustomers();
}

setupAdmin();
