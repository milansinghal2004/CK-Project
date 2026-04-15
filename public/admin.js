const state = {
  adminKey: localStorage.getItem("ck_admin_key") || "",
  adminUser: localStorage.getItem("ck_admin_user") || "",
  metrics: null,
  orders: [],
  chefs: [],
  tickets: [],
  statusFilter: "",
  search: "",
  ticketStatusFilter: "",
  ticketSearch: ""
};

if (!state.adminKey) {
  window.location.href = "/";
}

const refs = {
  adminUserBadge: document.getElementById("adminUserBadge"),
  adminLogoutBtn: document.getElementById("adminLogoutBtn"),
  refreshAllBtn: document.getElementById("refreshAllBtn"),
  adminNotice: document.getElementById("adminNotice"),
  kpiGrid: document.getElementById("kpiGrid"),
  orderStatusFilter: document.getElementById("orderStatusFilter"),
  orderSearchInput: document.getElementById("orderSearchInput"),
  adminOrdersGrid: document.getElementById("adminOrdersGrid"),
  chefGrid: document.getElementById("chefGrid"),
  ticketStatusFilter: document.getElementById("ticketStatusFilter"),
  ticketSearchInput: document.getElementById("ticketSearchInput"),
  ticketGrid: document.getElementById("ticketGrid"),
  adminOrderDialog: document.getElementById("adminOrderDialog"),
  adminOrderDialogTitle: document.getElementById("adminOrderDialogTitle"),
  adminOrderDialogBody: document.getElementById("adminOrderDialogBody"),
  closeAdminOrderDialogBtn: document.getElementById("closeAdminOrderDialogBtn")
};

boot();

async function boot() {
  refs.adminUserBadge.textContent = state.adminUser ? `Manager: ${state.adminUser}` : "Manager";
  wireEvents();
  await refreshAll();
  setInterval(refreshAll, 15000);
}

function wireEvents() {
  refs.adminLogoutBtn.addEventListener("click", () => {
    localStorage.removeItem("ck_admin_key");
    localStorage.removeItem("ck_admin_user");
    window.location.href = "/";
  });

  refs.refreshAllBtn.addEventListener("click", refreshAll);

  refs.orderStatusFilter.addEventListener("change", async (event) => {
    state.statusFilter = event.target.value;
    await loadOrders();
    renderOrders();
  });

  refs.orderSearchInput.addEventListener("input", async (event) => {
    state.search = event.target.value.trim();
    await loadOrders();
    renderOrders();
  });

  refs.ticketStatusFilter.addEventListener("change", async (event) => {
    state.ticketStatusFilter = event.target.value;
    await loadTickets();
    renderTickets();
  });

  refs.ticketSearchInput.addEventListener("input", async (event) => {
    state.ticketSearch = event.target.value.trim();
    await loadTickets();
    renderTickets();
  });

  refs.closeAdminOrderDialogBtn.addEventListener("click", () => refs.adminOrderDialog.close());
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "x-admin-key": state.adminKey
  };
}

async function refreshAll() {
  if (!state.adminKey) {
    showNotice("Please login again.");
    return;
  }
  try {
    await Promise.all([loadOverview(), loadOrders(), loadChefs(), loadTickets()]);
    renderOverview();
    renderOrders();
    renderChefs();
    renderTickets();
    showNotice("Dashboard synced.");
  } catch (error) {
    if (String(error.message || "").toLowerCase().includes("endpoint not found")) {
      showNotice("Admin API unavailable on current server. Start Postgres backend with: npm run start:db");
      return;
    }
    if (String(error.message || "").toLowerCase().includes("invalid admin key")) {
      showNotice("Session expired. Redirecting to login...");
      setTimeout(() => {
        localStorage.removeItem("ck_admin_key");
        localStorage.removeItem("ck_admin_user");
        window.location.href = "/";
      }, 800);
      return;
    }
    showNotice(`Unable to sync dashboard: ${error.message}`);
  }
}

async function loadOverview() {
  const res = await fetch("/api/admin/overview", { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Overview failed.");
  state.metrics = data.metrics;
}

async function loadOrders() {
  const query = new URLSearchParams();
  if (state.statusFilter) query.set("status", state.statusFilter);
  if (state.search) query.set("search", state.search);
  const res = await fetch(`/api/admin/orders?${query.toString()}`, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Orders failed.");
  state.orders = data.orders || [];
}

async function loadChefs() {
  const res = await fetch("/api/admin/chefs", { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Chefs failed.");
  state.chefs = data.chefs || [];
}

async function loadTickets() {
  const query = new URLSearchParams();
  if (state.ticketStatusFilter) query.set("status", state.ticketStatusFilter);
  if (state.ticketSearch) query.set("search", state.ticketSearch);
  const res = await fetch(`/api/admin/tickets?${query.toString()}`, { headers: adminHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Tickets failed.");
  state.tickets = data.tickets || [];
}

function renderOverview() {
  const m = state.metrics || {};
  const cards = [
    ["Today's Orders", m.total_orders || 0],
    ["Active Orders", m.active_orders || 0],
    ["Delivered Today", m.delivered_orders || 0],
    ["Cancelled Today", m.cancelled_orders || 0],
    ["Revenue Today", `Rs ${m.gross_revenue || 0}`],
    ["Chefs On Duty", `${m.on_duty_chefs || 0}/${m.total_chefs || 0}`],
    ["Open Tickets", m.open_tickets || 0]
  ];
  refs.kpiGrid.innerHTML = cards
    .map(
      ([title, value]) => `
      <article class="kpi-card">
        <p>${escapeHtml(title)}</p>
        <strong>${escapeHtml(String(value))}</strong>
      </article>
    `
    )
    .join("");
}

function renderOrders() {
  if (!state.orders.length) {
    refs.adminOrdersGrid.innerHTML = "<p>No orders found for this filter.</p>";
    return;
  }
  refs.adminOrdersGrid.innerHTML = state.orders
    .map(
      (o) => `
      <article class="admin-order-card">
        <h4>${escapeHtml(o.id)}</h4>
        <p><span class="chip">${escapeHtml(o.status)}</span> <span class="chip">${escapeHtml(o.paymentStatus || "Pending")}</span></p>
        <p>${escapeHtml(o.customerName)} (${escapeHtml(o.customerPhone)})</p>
        <p>Total: Rs ${o.total} | ${formatDateTime(o.createdAt)}</p>
        <p>Chef: ${o.assignedChef ? escapeHtml(o.assignedChef.name) : "Not assigned"}</p>
        <p>Item assignments: ${o.assignedItems || 0}/${o.totalItems || 0}</p>
        <div class="admin-order-actions">
          <button class="btn subtle" data-action="view" data-order-id="${o.id}">Details</button>
          <button class="btn subtle" data-action="assign" data-order-id="${o.id}">Assign Chef</button>
          <button class="btn subtle" data-action="status-prep" data-order-id="${o.id}">Preparing</button>
          <button class="btn subtle" data-action="status-out" data-order-id="${o.id}">Out for Delivery</button>
          <button class="btn subtle" data-action="status-done" data-order-id="${o.id}">Delivered</button>
        </div>
      </article>
    `
    )
    .join("");

  refs.adminOrdersGrid.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const orderId = btn.dataset.orderId;
      if (action === "view") return viewOrder(orderId);
      if (action === "assign") return assignChef(orderId);
      if (action === "status-prep") return updateStatus(orderId, "Preparing");
      if (action === "status-out") return updateStatus(orderId, "Out for Delivery");
      if (action === "status-done") return updateStatus(orderId, "Delivered");
    });
  });
}

function renderChefs() {
  if (!state.chefs.length) {
    refs.chefGrid.innerHTML = "<p>No chef records found.</p>";
    return;
  }
  refs.chefGrid.innerHTML = state.chefs
    .map(
      (c) => `
      <article class="chef-card">
        <h4>${escapeHtml(c.name)}</h4>
        <p>${escapeHtml(c.station)}</p>
        <div class="chef-row">
          <span class="chip">${c.isOnDuty ? "On Duty" : "Off Duty"}</span>
          <span class="chip">Assigned: ${c.assignedOrders}</span>
        </div>
        <button class="btn subtle" data-chef-toggle="${c.id}">${c.isOnDuty ? "Set Off Duty" : "Set On Duty"}</button>
      </article>
    `
    )
    .join("");

  refs.chefGrid.querySelectorAll("button[data-chef-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const chefId = btn.dataset.chefToggle;
      await toggleChefDuty(chefId);
    });
  });
}

function renderTickets() {
  if (!state.tickets.length) {
    refs.ticketGrid.innerHTML = "<p>No support tickets found.</p>";
    return;
  }

  refs.ticketGrid.innerHTML = state.tickets
    .map(
      (t) => `
      <article class="admin-order-card">
        <h4>${escapeHtml(t.id)}</h4>
        <p><span class="chip">${escapeHtml(t.status)}</span></p>
        <p><strong>Order:</strong> ${escapeHtml(t.orderId)}</p>
        <p><strong>Customer:</strong> ${escapeHtml(t.customerName)} (${escapeHtml(t.customerPhone)})</p>
        <p><strong>Query:</strong> ${escapeHtml(t.message)}</p>
        <p><strong>Last update:</strong> ${formatDateTime(t.managerReplyAt || t.createdAt)}</p>
        <div class="admin-order-actions">
          <button class="btn subtle" data-ticket-action="reply" data-ticket-id="${t.id}">Reply</button>
          <button class="btn subtle" data-ticket-action="close" data-ticket-id="${t.id}" ${t.status === "closed" ? "disabled" : ""}>Mark Closed</button>
        </div>
      </article>
    `
    )
    .join("");

  refs.ticketGrid.querySelectorAll("button[data-ticket-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ticketId = btn.dataset.ticketId;
      const action = btn.dataset.ticketAction;
      if (action === "reply") return replyToTicket(ticketId, false);
      if (action === "close") return replyToTicket(ticketId, true);
    });
  });
}

async function viewOrder(orderId) {
  const res = await fetch(`/api/orders/${orderId}`);
  const data = await res.json();
  if (!res.ok) return showNotice(data.message || "Unable to fetch order details.");

  const order = data.order;
  refs.adminOrderDialogTitle.textContent = `Order ${order.id}`;
  refs.adminOrderDialogBody.innerHTML = `
    <div class="detail-block">
      <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
      <p><strong>Payment:</strong> ${escapeHtml(order.paymentMode)} (${escapeHtml(order.paymentStatus || "Pending")})</p>
      <p><strong>Customer:</strong> ${escapeHtml(order.customer.name)} | ${escapeHtml(order.customer.phone)}</p>
      <p><strong>Address:</strong> ${escapeHtml(order.customer.address)}</p>
      <p><strong>Total:</strong> Rs ${order.pricing.total}</p>
    </div>
    <div class="detail-block">
      <strong>Update Order Status</strong>
      <div class="admin-modal-status-controls">
        <select id="modalStatusSelect">
          ${["Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"]
            .map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`)
            .join("")}
        </select>
        <input id="modalStatusNote" type="text" placeholder="Optional note (e.g., Rider assigned)" />
        <div class="order-actions">
          <button class="btn accent" id="modalUpdateStatusBtn">Update status</button>
          <button class="btn subtle" id="modalCancelOrderBtn" ${order.status === "Cancelled" || order.status === "Delivered" ? "disabled" : ""}>Manual Cancel</button>
        </div>
      </div>
    </div>
    <div class="detail-block">
      <strong>Items</strong>
      <ul class="timeline">
        ${(order.items || [])
          .map(
            (it) => `
          <li>
            <div><strong>${escapeHtml(it.name)}</strong> x ${it.quantity}</div>
            <div class="admin-modal-status-controls">
              <span class="chip">${it.assignedChef ? `Chef: ${escapeHtml(it.assignedChef.chefName)}` : "No chef assigned"}</span>
              <div class="order-actions">
                <select data-item-chef-select="${order.id}::${it.id}">
                  ${renderChefOptions(it.assignedChef?.chefId || "")}
                </select>
                <button class="btn subtle" data-item-chef-assign="${order.id}::${it.id}">Assign Chef</button>
              </div>
            </div>
          </li>
        `
          )
          .join("")}
      </ul>
    </div>
    <div class="detail-block">
      <strong>Status Timeline</strong>
      <ul class="timeline">
        ${(order.statusHistory || []).map((h) => `<li>${escapeHtml(h.status)} - ${formatDateTime(h.at)}</li>`).join("")}
      </ul>
    </div>
  `;
  refs.adminOrderDialog.showModal();

  const modalStatusSelect = document.getElementById("modalStatusSelect");
  const modalStatusNote = document.getElementById("modalStatusNote");
  const modalUpdateStatusBtn = document.getElementById("modalUpdateStatusBtn");
  const modalCancelOrderBtn = document.getElementById("modalCancelOrderBtn");

  if (modalUpdateStatusBtn) {
    modalUpdateStatusBtn.addEventListener("click", async () => {
      const nextStatus = modalStatusSelect?.value || order.status;
      const note = modalStatusNote?.value?.trim() || "Updated from order details modal";
      await updateStatus(order.id, nextStatus, note);
      refs.adminOrderDialog.close();
    });
  }

  if (modalCancelOrderBtn) {
    modalCancelOrderBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("Cancel this order manually? This will notify the customer immediately.");
      if (!confirmed) return;
      await updateStatus(order.id, "Cancelled", "Cancelled by manager from order details");
      refs.adminOrderDialog.close();
    });
  }

  refs.adminOrderDialogBody.querySelectorAll("button[data-item-chef-assign]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const [targetOrderId, targetItemId] = String(btn.dataset.itemChefAssign || "").split("::");
      const select = refs.adminOrderDialogBody.querySelector(`select[data-item-chef-select="${targetOrderId}::${targetItemId}"]`);
      const chefId = String(select?.value || "").trim();
      if (!chefId) return showNotice("Pick a chef first.");
      await assignChefToOrderItem(targetOrderId, targetItemId, chefId);
      await viewOrder(orderId);
    });
  });
}

function renderChefOptions(selectedChefId = "") {
  const onDuty = state.chefs.filter((chef) => chef.isOnDuty);
  if (!onDuty.length) return `<option value="">No on-duty chef</option>`;
  return onDuty
    .map((chef) => `<option value="${chef.id}" ${selectedChefId === chef.id ? "selected" : ""}>${escapeHtml(chef.name)} (${escapeHtml(chef.station)})</option>`)
    .join("");
}

async function assignChef(orderId) {
  if (!state.chefs.length) return showNotice("No chefs available.");
  const onDuty = state.chefs.filter((c) => c.isOnDuty);
  if (!onDuty.length) return showNotice("No chef is on duty.");
  const pick = window.prompt(
    `Enter chef ID to assign:\n${onDuty.map((c) => `${c.id} - ${c.name}`).join("\n")}`,
    onDuty[0].id
  );
  if (!pick) return;
  const res = await fetch(`/api/admin/orders/${orderId}/assign-chef`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ chefId: pick.trim() })
  });
  const data = await res.json();
  if (!res.ok) return showNotice(data.message || "Assign failed.");
  showNotice("Chef assigned.");
  await refreshAll();
}

async function updateStatus(orderId, status, note = "Updated by manager dashboard") {
  const res = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ status, note })
  });
  const data = await res.json();
  if (!res.ok) return showNotice(data.message || "Status update failed.");
  showNotice(`Order ${orderId} -> ${status}`);
  await refreshAll();
}

async function assignChefToOrderItem(orderId, itemId, chefId) {
  const res = await fetch(`/api/admin/orders/${orderId}/items/${itemId}/assign-chef`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ chefId })
  });
  const data = await res.json();
  if (!res.ok) {
    showNotice(data.message || "Item-level assignment failed.");
    return;
  }
  showNotice(`Chef assigned for item ${itemId}.`);
  await refreshAll();
}

async function replyToTicket(ticketId, closeTicket) {
  const promptText = closeTicket ? "Closing note to customer:" : "Reply to customer:";
  const message = window.prompt(promptText, closeTicket ? "Issue resolved. Thanks for your patience." : "We are checking this right away.");
  if (!message) return;
  const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ message, closeTicket, adminName: state.adminUser || "manager" })
  });
  const data = await res.json();
  if (!res.ok) return showNotice(data.message || "Unable to reply to ticket.");
  showNotice(`Ticket ${ticketId} updated.`);
  await refreshAll();
}

async function toggleChefDuty(chefId) {
  const res = await fetch(`/api/admin/chefs/${chefId}/toggle-duty`, {
    method: "POST",
    headers: adminHeaders()
  });
  const data = await res.json();
  if (!res.ok) return showNotice(data.message || "Chef update failed.");
  showNotice(`Chef ${data.chef.name} duty updated.`);
  await refreshAll();
}

function showNotice(message) {
  refs.adminNotice.textContent = message;
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
