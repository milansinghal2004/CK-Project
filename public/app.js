const API = "";
const sessionId = loadOrCreateSessionId();

const state = {
  menu: [],
  categories: [],
  offers: [],
  todaysSpecial: null,
  cart: { items: [], pricing: { subtotal: 0, discount: 0, deliveryFee: 0, tax: 0, total: 0 } },
  orders: { currentOrders: [], pastOrders: [] },
  selectedCategory: "All",
  search: "",
  user: loadStoredUser(),
  lastPhone: loadStoredPhone()
};

const refs = {
  menuGrid: document.getElementById("menuGrid"),
  checkoutOfferGrid: document.getElementById("checkoutOfferGrid"),
  categorySelect: document.getElementById("categorySelect"),
  searchInput: document.getElementById("searchInput"),
  openDealsBtn: document.getElementById("openDealsBtn"),
  cartBtn: document.getElementById("cartBtn"),
  cartCount: document.getElementById("cartCount"),
  cartPanel: document.getElementById("cartPanel"),
  closeCartBtn: document.getElementById("closeCartBtn"),
  cartItems: document.getElementById("cartItems"),
  cartPricing: document.getElementById("cartPricing"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  backdrop: document.getElementById("backdrop"),
  offerInput: document.getElementById("offerInput"),
  applyOfferBtn: document.getElementById("applyOfferBtn"),
  availOffersBtn: document.getElementById("availOffersBtn"),
  checkoutOffersWrap: document.getElementById("checkoutOffersWrap"),
  authBtn: document.getElementById("authBtn"),
  ordersBtn: document.getElementById("ordersBtn"),
  refreshOrdersBtn: document.getElementById("refreshOrdersBtn"),
  currentOrdersList: document.getElementById("currentOrdersList"),
  pastOrdersList: document.getElementById("pastOrdersList"),
  authDialog: document.getElementById("authDialog"),
  authForm: document.getElementById("authForm"),
  authMode: document.getElementById("authMode"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  checkoutDialog: document.getElementById("checkoutDialog"),
  checkoutForm: document.getElementById("checkoutForm"),
  orderName: document.getElementById("orderName"),
  orderPhone: document.getElementById("orderPhone"),
  orderAddress: document.getElementById("orderAddress"),
  paymentMode: document.getElementById("paymentMode"),
  menuBtn: document.getElementById("menuBtn"),
  navLinks: document.getElementById("navLinks"),
  menuCardTemplate: document.getElementById("menuCardTemplate"),
  todaySpecialName: document.getElementById("todaySpecialName"),
  todaySpecialDesc: document.getElementById("todaySpecialDesc"),
  todaySpecialPrice: document.getElementById("todaySpecialPrice"),
  todaySpecialCategory: document.getElementById("todaySpecialCategory"),
  todaySpecialImage: document.getElementById("todaySpecialImage"),
  todaySpecialAddBtn: document.getElementById("todaySpecialAddBtn"),
  liveNotice: document.getElementById("liveNotice"),
  orderDetailDialog: document.getElementById("orderDetailDialog"),
  orderDetailTitle: document.getElementById("orderDetailTitle"),
  orderDetailBody: document.getElementById("orderDetailBody"),
  closeOrderDetailBtn: document.getElementById("closeOrderDetailBtn")
};

boot();

async function boot() {
  wireEvents();
  await Promise.all([loadCategories(), loadOffers(), loadMenu(), loadCart(), loadOrders(), loadTodaysSpecial()]);
  renderAll();
  startRealtimeUpdates();
  if (state.user?.name) refs.orderName.value = state.user.name;
  if (state.lastPhone) refs.orderPhone.value = state.lastPhone;
  setInterval(async () => {
    await loadOrders();
    renderOrders();
  }, 30000);
}

function wireEvents() {
  refs.menuBtn.addEventListener("click", () => refs.navLinks.classList.toggle("open"));

  refs.categorySelect.addEventListener("change", async (event) => {
    state.selectedCategory = event.target.value;
    await loadMenu();
    renderMenu();
  });

  refs.searchInput.addEventListener("input", async (event) => {
    state.search = event.target.value;
    await loadMenu();
    renderMenu();
  });

  refs.cartBtn.addEventListener("click", openCart);
  refs.closeCartBtn.addEventListener("click", closeCart);
  refs.backdrop.addEventListener("click", closeCart);

  refs.applyOfferBtn.addEventListener("click", applyOfferCode);
  refs.availOffersBtn.addEventListener("click", toggleOffersVisibility);
  refs.checkoutBtn.addEventListener("click", openCheckoutDialog);
  refs.openDealsBtn.addEventListener("click", openCart);

  refs.ordersBtn.addEventListener("click", async () => {
    document.getElementById("orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
    await loadOrders();
    renderOrders();
  });

  refs.refreshOrdersBtn.addEventListener("click", async () => {
    await loadOrders();
    renderOrders();
  });

  refs.todaySpecialAddBtn.addEventListener("click", async () => {
    if (!state.todaysSpecial?.id) return;
    await addToCart(state.todaysSpecial.id, 1);
  });

  refs.authBtn.addEventListener("click", () => {
    if (state.user) {
      const shouldLogout = window.confirm("Logout from this device?");
      if (shouldLogout) {
        state.user = null;
        persistUser(null);
        updateAuthButton();
      }
      return;
    }
    refs.authDialog.showModal();
  });

  refs.authForm.addEventListener("submit", submitAuth);
  document.querySelector("[data-close-auth]").addEventListener("click", () => refs.authDialog.close());
  document.querySelector("[data-close-checkout]").addEventListener("click", () => refs.checkoutDialog.close());
  refs.closeOrderDetailBtn.addEventListener("click", () => refs.orderDetailDialog.close());

  refs.checkoutForm.addEventListener("submit", submitCheckout);

  document.querySelectorAll("[data-add-item]").forEach((button) => {
    button.addEventListener("click", async () => {
      await addToCart(button.dataset.addItem, 1);
    });
  });
}

function renderAll() {
  renderCategories();
  renderMenu();
  renderOffers();
  renderCart();
  renderOrders();
  renderTodaysSpecial();
  updateAuthButton();
}

function renderCategories() {
  refs.categorySelect.innerHTML = state.categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join("");
  refs.categorySelect.value = state.selectedCategory;
}

function renderMenu() {
  refs.menuGrid.innerHTML = "";
  for (const item of state.menu) {
    const card = refs.menuCardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".dish-image").src = item.image;
    card.querySelector(".dish-image").alt = item.name;
    card.querySelector("h4").textContent = item.name;
    card.querySelector(".rating").textContent = `* ${item.rating}`;
    card.querySelector(".dish-desc").textContent = item.description;
    card.querySelector(".price").textContent = `Rs ${item.price}`;
    card.querySelector(".prep").textContent = `${item.prepMinutes} mins`;
    card.querySelector(".add-btn").addEventListener("click", () => addToCart(item.id, 1));
    refs.menuGrid.append(card);
  }
  if (state.menu.length === 0) refs.menuGrid.innerHTML = "<p>No matching dishes found.</p>";
}

function renderOffers() {
  refs.checkoutOfferGrid.innerHTML = state.offers
    .map(
      (offer) => `
      <article class="offer-card">
        <h4>${escapeHtml(offer.title)}</h4>
        <p>${escapeHtml(offer.description)}</p>
        <span class="offer-code">${escapeHtml(offer.code)}</span>
      </article>
    `
    )
    .join("");
  refs.checkoutOfferGrid.querySelectorAll(".offer-code").forEach((badge) => {
    badge.addEventListener("click", () => {
      refs.offerInput.value = badge.textContent.trim();
      showLiveNotice(`Offer code ${badge.textContent.trim()} copied to checkout`);
    });
  });
}

function toggleOffersVisibility() {
  const isHidden = refs.checkoutOffersWrap.hasAttribute("hidden");
  if (isHidden) {
    refs.checkoutOffersWrap.removeAttribute("hidden");
    refs.availOffersBtn.textContent = "Hide Offers";
    return;
  }
  refs.checkoutOffersWrap.setAttribute("hidden", "");
  refs.availOffersBtn.textContent = "Avail Offers";
}

function renderTodaysSpecial() {
  if (!state.todaysSpecial) {
    refs.todaySpecialName.textContent = "Today's Special";
    refs.todaySpecialDesc.textContent = "No special available right now.";
    refs.todaySpecialPrice.textContent = "Rs --";
    refs.todaySpecialCategory.textContent = "Category --";
    refs.todaySpecialAddBtn.disabled = true;
    return;
  }
  refs.todaySpecialName.textContent = state.todaysSpecial.name;
  refs.todaySpecialDesc.textContent = state.todaysSpecial.description;
  refs.todaySpecialPrice.textContent = `Rs ${state.todaysSpecial.price}`;
  refs.todaySpecialCategory.textContent = state.todaysSpecial.category;
  refs.todaySpecialImage.src = state.todaysSpecial.image;
  refs.todaySpecialImage.alt = state.todaysSpecial.name;
  refs.todaySpecialAddBtn.disabled = false;
}

function renderOrders() {
  const current = state.orders.currentOrders || [];
  const past = state.orders.pastOrders || [];

  refs.currentOrdersList.innerHTML = current.length
    ? current.map((order) => renderOrderCard(order, true)).join("")
    : "<p class='empty-orders'>No active order right now.</p>";

  refs.pastOrdersList.innerHTML = past.length
    ? past.map((order) => renderOrderCard(order, false)).join("")
    : "<p class='empty-orders'>No past orders yet.</p>";

  bindOrderActions();
}

function renderOrderCard(order, isCurrent) {
  const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const etaLeft = Math.max(0, Number(order.etaMinutes || 32) - minutesSince(order.createdAt));
  const etaText = order.status === "Delivered" ? "Delivered" : order.status === "Cancelled" ? "Cancelled" : `${etaLeft} mins left`;

  return `
    <article class="order-card">
      <div class="order-top">
        <strong>${escapeHtml(order.id)}</strong>
        <span class="order-status ${order.status === "Delivered" ? "done" : order.status === "Cancelled" ? "cancel" : "live"}">${escapeHtml(order.status)}</span>
      </div>
      <p>${itemCount} item(s) | Rs ${order.pricing.total} | ${escapeHtml(order.paymentMode)}</p>
      <p>Payment: ${escapeHtml(order.paymentStatus || "Pending")}</p>
      <p>${escapeHtml(etaText)} | Ordered ${escapeHtml(timeAgo(order.createdAt))}</p>
      <div class="order-actions">
        <button class="btn subtle" data-action="details" data-order-id="${order.id}">Details</button>
        ${isCurrent && order.canCancel ? `<button class="btn subtle" data-action="cancel" data-order-id="${order.id}">Cancel</button>` : ""}
        <button class="btn subtle" data-action="reorder" data-order-id="${order.id}">Reorder</button>
      </div>
    </article>
  `;
}

function bindOrderActions() {
  document.querySelectorAll("[data-action='details']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await viewOrderDetails(btn.dataset.orderId);
    });
  });

  document.querySelectorAll("[data-action='cancel']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await cancelOrder(btn.dataset.orderId);
    });
  });

  document.querySelectorAll("[data-action='reorder']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await reorderOrder(btn.dataset.orderId);
    });
  });
}

function renderCart() {
  const items = state.cart.items || [];
  refs.cartCount.textContent = String(items.reduce((sum, item) => sum + item.quantity, 0));

  if (items.length === 0) {
    refs.cartItems.innerHTML = "<p>Your cart is empty. Add some dishes.</p>";
  } else {
    refs.cartItems.innerHTML = items
      .map(
        (item) => `
          <article class="cart-item">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" />
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <p>Rs ${item.price}</p>
              <div class="qty-row">
                <button data-item-id="${item.id}" data-action="decrease">-</button>
                <span>${item.quantity}</span>
                <button data-item-id="${item.id}" data-action="increase">+</button>
              </div>
            </div>
            <strong>Rs ${item.price * item.quantity}</strong>
          </article>
        `
      )
      .join("");

    refs.cartItems.querySelectorAll("button[data-item-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.dataset.itemId;
        const cartItem = items.find((it) => it.id === id);
        if (!cartItem) return;
        const quantity = button.dataset.action === "increase" ? cartItem.quantity + 1 : cartItem.quantity - 1;
        await updateCartItemQuantity(id, quantity);
      });
    });
  }

  const pricing = state.cart.pricing || {};
  refs.cartPricing.innerHTML = `
    <div class="price-row"><span>Subtotal</span><span>Rs ${pricing.subtotal || 0}</span></div>
    <div class="price-row"><span>Discount</span><span>- Rs ${pricing.discount || 0}</span></div>
    <div class="price-row"><span>Delivery Fee</span><span>Rs ${pricing.deliveryFee || 0}</span></div>
    <div class="price-row"><span>Tax</span><span>Rs ${pricing.tax || 0}</span></div>
    <div class="price-row total"><span>Total</span><span>Rs ${pricing.total || 0}</span></div>
  `;
}

function updateAuthButton() {
  refs.authBtn.textContent = state.user ? `Hi, ${state.user.name.split(" ")[0]}` : "Sign in";
}

function openCart() {
  refs.cartPanel.classList.add("open");
  refs.backdrop.classList.add("show");
  refs.checkoutOffersWrap.setAttribute("hidden", "");
  refs.availOffersBtn.textContent = "Avail Offers";
}

function closeCart() {
  refs.cartPanel.classList.remove("open");
  refs.backdrop.classList.remove("show");
}

function openCheckoutDialog() {
  if (!state.cart.items || state.cart.items.length === 0) {
    alert("Your cart is empty.");
    return;
  }
  refs.checkoutDialog.showModal();
}

async function applyOfferCode() {
  const offerCode = refs.offerInput.value.trim();
  if (!offerCode) return;
  const response = await fetch(`${API}/api/cart/offer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, offerCode })
  });
  if (!response.ok) {
    alert("Could not apply offer.");
    return;
  }
  await loadCart();
  renderCart();
}

async function submitAuth(event) {
  event.preventDefault();
  const mode = refs.authMode.value;
  const payload = {
    name: refs.authName.value.trim(),
    email: refs.authEmail.value.trim(),
    password: refs.authPassword.value
  };
  const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
  const response = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.message || "Authentication failed");
    return;
  }
  state.user = data.user;
  persistUser(state.user);
  updateAuthButton();
  await loadOrders();
  renderOrders();
  refs.authDialog.close();
  refs.authForm.reset();
  alert(`${mode === "register" ? "Registered" : "Logged in"} successfully`);
}

async function submitCheckout(event) {
  event.preventDefault();
  const payload = {
    sessionId,
    name: refs.orderName.value.trim(),
    phone: refs.orderPhone.value.trim(),
    address: refs.orderAddress.value.trim(),
    paymentMode: refs.paymentMode.value,
    userId: state.user?.id || "",
    idempotencyKey: generateIdempotencyKey()
  };
  const response = await fetch(`${API}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.message || "Checkout failed");
    return;
  }
  refs.checkoutDialog.close();
  persistPhone(payload.phone);
  state.lastPhone = payload.phone;
  refs.checkoutForm.reset();
  await Promise.all([loadCart(), loadOrders()]);
  renderCart();
  renderOrders();
  closeCart();
  document.getElementById("orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
  alert(`Order placed. Order ID: ${data.orderId}. ETA: ${data.etaMinutes} minutes.`);
}

async function viewOrderDetails(orderId) {
  const response = await fetch(`${API}/api/orders/${orderId}?${orderQueryParams().toString()}`);
  const data = await response.json();
  if (!response.ok || !data.order) {
    alert(data.message || "Could not load order details.");
    return;
  }

  const order = data.order;
  refs.orderDetailTitle.textContent = `Order ${order.id}`;
  const itemRows = order.items
    .map((item) => `<li>${escapeHtml(item.name)} x ${item.quantity} - Rs ${item.price * item.quantity}</li>`)
    .join("");
  const timeline = (order.statusHistory || [])
    .map((entry) => `<li><strong>${escapeHtml(entry.status)}</strong> - ${escapeHtml(formatDateTime(entry.at))}${entry.note ? ` (${escapeHtml(entry.note)})` : ""}</li>`)
    .join("");
  const supportTimeline = renderSupportTickets(order.supportTickets || []);

  refs.orderDetailBody.innerHTML = `
    <div class="detail-block">
      <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
      <p><strong>Payment:</strong> ${escapeHtml(order.paymentMode)}</p>
      <p><strong>Payment State:</strong> ${escapeHtml(order.paymentStatus || "Pending")}</p>
      <p><strong>Total:</strong> Rs ${order.pricing.total}</p>
      <p><strong>Address:</strong> ${escapeHtml(order.customer.address)}</p>
    </div>
    <div class="detail-block">
      <strong>Items</strong>
      <ul class="timeline">${itemRows}</ul>
    </div>
    <div class="detail-block">
      <strong>Status Timeline</strong>
      <ul class="timeline">${timeline}</ul>
    </div>
    <div class="detail-block">
      <strong>Support Queries</strong>
      ${supportTimeline}
    </div>
    <div class="order-actions">
      <button class="btn subtle" id="detailCancelBtn" ${order.canCancel ? "" : "disabled"}>${order.canCancel ? "Cancel Order" : "Cancellation Closed"}</button>
      ${order.paymentStatus === "Pending" ? `<button class="btn subtle" id="detailPayBtn">Mark Paid</button>` : ""}
      <button class="btn subtle" id="detailReorderBtn">Reorder</button>
      <button class="btn subtle" id="detailSupportBtn">Need Help</button>
    </div>
  `;

  refs.orderDetailDialog.showModal();

  const detailCancelBtn = document.getElementById("detailCancelBtn");
  const detailPayBtn = document.getElementById("detailPayBtn");
  const detailReorderBtn = document.getElementById("detailReorderBtn");
  const detailSupportBtn = document.getElementById("detailSupportBtn");

  if (detailCancelBtn && order.canCancel) {
    detailCancelBtn.addEventListener("click", async () => {
      await cancelOrder(order.id);
      refs.orderDetailDialog.close();
    });
  }

  if (detailPayBtn) {
    detailPayBtn.addEventListener("click", async () => {
      await payOrder(order.id);
      refs.orderDetailDialog.close();
    });
  }

  if (detailReorderBtn) {
    detailReorderBtn.addEventListener("click", async () => {
      await reorderOrder(order.id);
      refs.orderDetailDialog.close();
    });
  }

  if (detailSupportBtn) {
    detailSupportBtn.addEventListener("click", async () => {
      const message = window.prompt("Describe your issue:", "Need update on delivery");
      if (!message) return;
      const support = await fetch(`${API}/api/orders/${order.id}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const supportData = await support.json();
      if (!support.ok) {
        alert(supportData.message || "Unable to create support ticket.");
        return;
      }
      const latestSupport = await fetch(`${API}/api/orders/${order.id}/support`);
      const latestSupportData = await latestSupport.json();
      if (latestSupport.ok) {
        const supportBlock = refs.orderDetailBody.querySelector(".detail-block:nth-of-type(4)");
        if (supportBlock) {
          supportBlock.innerHTML = `<strong>Support Queries</strong>${renderSupportTickets(latestSupportData.tickets || [])}`;
        }
      }
      alert(`Support ticket created: ${supportData.ticketId}`);
    });
  }
}

function renderSupportTickets(tickets) {
  if (!tickets.length) return "<p class='empty-orders'>No support query raised yet.</p>";
  return `
    <div class="support-thread">
      ${tickets
        .map((ticket) => {
          const allReplies = Array.isArray(ticket.replies) ? ticket.replies : [];
          const replies = allReplies.filter((reply, idx) => {
            if (idx !== 0) return true;
            return !(
              reply.authorType === "customer" &&
              String(reply.message || "").trim().toLowerCase() === String(ticket.message || "").trim().toLowerCase()
            );
          });
          return `
            <article class="support-ticket-card">
              <p class="support-ticket-head">
                <strong>${escapeHtml(ticket.id)}</strong>
                <span>${escapeHtml(ticket.status)}</span>
                <span>${escapeHtml(formatDateTime(ticket.createdAt))}</span>
              </p>
              <p class="support-ticket-msg">${escapeHtml(ticket.message)}</p>
              ${
                replies.length
                  ? `<div class="support-reply-list">
                      ${replies
                        .map(
                          (reply) => `
                        <div class="support-reply">
                          <strong>${escapeHtml(reply.authorType === "admin" ? "Manager" : "You")}:</strong>
                          <span>${escapeHtml(reply.message)}</span>
                          <em>${escapeHtml(formatDateTime(reply.at))}</em>
                        </div>
                      `
                        )
                        .join("")}
                    </div>`
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

async function cancelOrder(orderId) {
  const reason = window.prompt("Reason for cancellation:", "Changed my mind") || "Cancelled by user";
  const response = await fetch(`${API}/api/orders/${orderId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, userId: state.user?.id || "", phone: state.lastPhone || "", reason })
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.message || "Unable to cancel this order.");
    return;
  }
  await loadOrders();
  renderOrders();
  alert("Order cancelled successfully.");
}

async function reorderOrder(orderId) {
  const response = await fetch(`${API}/api/orders/${orderId}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, userId: state.user?.id || "", phone: state.lastPhone || "" })
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.message || "Unable to reorder.");
    return;
  }
  await loadCart();
  renderCart();
  alert(`Added ${data.addedItems} item(s) from previous order.`);
}

async function payOrder(orderId) {
  const response = await fetch(`${API}/api/orders/${orderId}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      userId: state.user?.id || "",
      phone: state.lastPhone || "",
      paymentRef: `TXN-${Date.now()}`
    })
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.message || "Unable to update payment status.");
    return;
  }
  await loadOrders();
  renderOrders();
  showLiveNotice(`Payment updated: ${data.paymentStatus}`);
}

async function addToCart(itemId, quantity) {
  const response = await fetch(`${API}/api/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, itemId, quantity })
  });
  if (!response.ok) {
    alert("Could not add item to cart.");
    return;
  }
  await loadCart();
  renderCart();
  showLiveNotice("Item added to cart");
}

async function updateCartItemQuantity(itemId, quantity) {
  const response = await fetch(`${API}/api/cart/item`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, itemId, quantity })
  });
  if (!response.ok) {
    alert("Could not update item.");
    return;
  }
  await loadCart();
  renderCart();
}

async function loadMenu() {
  const query = new URLSearchParams();
  if (state.selectedCategory) query.set("category", state.selectedCategory);
  if (state.search) query.set("search", state.search);
  const response = await fetch(`${API}/api/menu?${query.toString()}`);
  const data = await response.json();
  state.menu = data.items || [];
}

async function loadCategories() {
  const response = await fetch(`${API}/api/categories`);
  const data = await response.json();
  state.categories = data.categories || ["All"];
}

async function loadOffers() {
  const response = await fetch(`${API}/api/offers`);
  const data = await response.json();
  state.offers = data.offers || [];
}

async function loadTodaysSpecial() {
  const response = await fetch(`${API}/api/special/today`);
  const data = await response.json();
  state.todaysSpecial = data.special || null;
}

async function loadOrders() {
  const response = await fetch(`${API}/api/orders?${orderQueryParams().toString()}`);
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  state.orders = {
    currentOrders: data.currentOrders || [],
    pastOrders: data.pastOrders || []
  };
}

async function loadCart() {
  const response = await fetch(`${API}/api/cart?sessionId=${encodeURIComponent(sessionId)}`);
  const data = await response.json();
  state.cart = data.cart || { items: [], pricing: {} };
}

function orderQueryParams() {
  const query = new URLSearchParams();
  query.set("sessionId", sessionId);
  if (state.user?.id) query.set("userId", state.user.id);
  if (state.lastPhone) query.set("phone", state.lastPhone);
  return query;
}

function startRealtimeUpdates() {
  if (!window.EventSource) return;
  const stream = new EventSource(`${API}/api/events?sessionId=${encodeURIComponent(sessionId)}`);
  stream.addEventListener("connected", () => showLiveNotice("Live order updates connected"));
  stream.addEventListener("order_updated", async () => {
    await loadOrders();
    renderOrders();
    showLiveNotice("Order status updated");
  });
  stream.addEventListener("support_updated", async () => {
    await loadOrders();
    renderOrders();
    showLiveNotice("Support ticket updated");
  });
  stream.addEventListener("cart_updated", async () => {
    await loadCart();
    renderCart();
  });
}

function showLiveNotice(message) {
  if (!refs.liveNotice) return;
  refs.liveNotice.textContent = message;
  refs.liveNotice.classList.add("show");
  setTimeout(() => refs.liveNotice.classList.remove("show"), 2400);
}

function loadOrCreateSessionId() {
  const key = "ck_session_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `sess_${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(key, id);
  return id;
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem("ck_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (!user) {
    localStorage.removeItem("ck_user");
    return;
  }
  localStorage.setItem("ck_user", JSON.stringify(user));
}

function loadStoredPhone() {
  return localStorage.getItem("ck_last_phone") || "";
}

function persistPhone(phone) {
  if (!phone) return;
  localStorage.setItem("ck_last_phone", phone);
}

function generateIdempotencyKey() {
  return `idem_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function minutesSince(isoDate) {
  return Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000));
}

function timeAgo(isoDate) {
  const mins = minutesSince(isoDate);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour ago`;
  const days = Math.floor(hours / 24);
  return `${days} day ago`;
}

function formatDateTime(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
