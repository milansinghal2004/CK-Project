const { useEffect, useMemo, useState } = React;

function AdminApp() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem("ck_admin_key") || "");
  const [adminUser, setAdminUser] = useState(localStorage.getItem("ck_admin_user") || "");
  const [notice, setNotice] = useState("");
  const [metrics, setMetrics] = useState({});
  const [orders, setOrders] = useState([]);
  const [chefs, setChefs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [itemChefDraft, setItemChefDraft] = useState({});

  useEffect(() => {
    if (!adminKey) {
      window.location.href = "/";
      return;
    }
    if (selectedOrder) {
      const nextDraft = {};
      (selectedOrder.items || []).forEach((item) => {
        nextDraft[item.id] = item.assignedChef?.chefId || (onDutyChefs[0]?.id || "");
      });
      setItemChefDraft(nextDraft);
    }
  }, [onDutyChefs, selectedOrder]);

  useEffect(() => {
    if (!adminKey) {
      window.location.href = "/";
      return;
    }
    refreshAll();
    const timer = setInterval(() => refreshAll(), 15000);
    return () => clearInterval(timer);
  }, [adminKey, statusFilter, orderSearch, ticketStatusFilter, ticketSearch]);

  const onDutyChefs = useMemo(() => chefs.filter((c) => c.isOnDuty), [chefs]);

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
        ...(options.headers || {})
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  }

  async function refreshAll() {
    try {
      const orderParams = new URLSearchParams();
      if (statusFilter) orderParams.set("status", statusFilter);
      if (orderSearch) orderParams.set("search", orderSearch);

      const ticketParams = new URLSearchParams();
      if (ticketStatusFilter) ticketParams.set("status", ticketStatusFilter);
      if (ticketSearch) ticketParams.set("search", ticketSearch);

      const [overviewData, ordersData, chefsData, ticketsData] = await Promise.all([
        fetchJson("/api/admin/overview"),
        fetchJson(`/api/admin/orders?${orderParams.toString()}`),
        fetchJson("/api/admin/chefs"),
        fetchJson(`/api/admin/tickets?${ticketParams.toString()}`)
      ]);

      setMetrics(overviewData.metrics || {});
      setOrders(ordersData.orders || []);
      setChefs(chefsData.chefs || []);
      setTickets(ticketsData.tickets || []);
      setNotice("Dashboard synced.");
    } catch (error) {
      const message = String(error.message || "");
      if (message.toLowerCase().includes("invalid admin key")) {
        setNotice("Session expired. Redirecting to login...");
        localStorage.removeItem("ck_admin_key");
        localStorage.removeItem("ck_admin_user");
        setTimeout(() => (window.location.href = "/"), 800);
        return;
      }
      if (message.toLowerCase().includes("endpoint not found")) {
        setNotice("Admin API unavailable on current server. Start Postgres backend with: npm run start:db");
        return;
      }
      setNotice(`Unable to sync dashboard: ${message}`);
    }
  }

  function logout() {
    localStorage.removeItem("ck_admin_key");
    localStorage.removeItem("ck_admin_user");
    setAdminKey("");
    setAdminUser("");
    window.location.href = "/";
  }

  async function viewOrder(orderId) {
    try {
      const data = await fetchJson(`/api/orders/${orderId}`);
      setSelectedOrder(data.order);
    } catch (error) {
      setNotice(error.message || "Unable to load order details.");
    }
  }

  async function updateStatus(orderId, status, note = "Updated by manager dashboard") {
    try {
      await fetchJson(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note })
      });
      setNotice(`Order ${orderId} -> ${status}`);
      await refreshAll();
      if (selectedOrder?.id === orderId) await viewOrder(orderId);
    } catch (error) {
      setNotice(error.message || "Status update failed.");
    }
  }

  async function assignOrderChef(orderId) {
    if (!onDutyChefs.length) {
      setNotice("No chef is on duty.");
      return;
    }
    const pick = window.prompt(
      `Enter chef ID to assign:\n${onDutyChefs.map((c) => `${c.id} - ${c.name}`).join("\n")}`,
      onDutyChefs[0].id
    );
    if (!pick) return;
    try {
      await fetchJson(`/api/admin/orders/${orderId}/assign-chef`, {
        method: "POST",
        body: JSON.stringify({ chefId: pick.trim() })
      });
      setNotice("Chef assigned.");
      await refreshAll();
    } catch (error) {
      setNotice(error.message || "Assign failed.");
    }
  }

  async function assignChefToItem(orderId, itemId) {
    const chefId = String(itemChefDraft[itemId] || "").trim();
    if (!chefId) {
      setNotice("Select a chef for this item.");
      return;
    }
    try {
      await fetchJson(`/api/admin/orders/${orderId}/items/${itemId}/assign-chef`, {
        method: "POST",
        body: JSON.stringify({ chefId })
      });
      setNotice("Chef assigned for order item.");
      await refreshAll();
      await viewOrder(orderId);
    } catch (error) {
      setNotice(error.message || "Item assignment failed.");
    }
  }

  async function toggleChefDuty(chefId) {
    try {
      const data = await fetchJson(`/api/admin/chefs/${chefId}/toggle-duty`, { method: "POST" });
      setNotice(`Chef ${data.chef.name} duty updated.`);
      await refreshAll();
    } catch (error) {
      setNotice(error.message || "Chef update failed.");
    }
  }

  async function replyTicket(ticketId, closeTicket) {
    const message = window.prompt(
      closeTicket ? "Closing note to customer:" : "Reply to customer:",
      closeTicket ? "Issue resolved. Thanks for your patience." : "We are checking this right away."
    );
    if (!message) return;
    try {
      await fetchJson(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message, closeTicket, adminName: adminUser || "manager" })
      });
      setNotice(`Ticket ${ticketId} updated.`);
      await refreshAll();
    } catch (error) {
      setNotice(error.message || "Unable to reply ticket.");
    }
  }

  const kpis = [
    ["Today's Orders", metrics.total_orders || 0],
    ["Active Orders", metrics.active_orders || 0],
    ["Delivered Today", metrics.delivered_orders || 0],
    ["Cancelled Today", metrics.cancelled_orders || 0],
    ["Revenue Today", `Rs ${metrics.gross_revenue || 0}`],
    ["Chefs On Duty", `${metrics.on_duty_chefs || 0}/${metrics.total_chefs || 0}`],
    ["Open Tickets", metrics.open_tickets || 0]
  ];

  return (
    <>
      <div className="site-bg"></div>
      <header className="topbar">
        <div className="topbar-inner container">
          <a className="brand" href="/admin.html">
            <img src="/assets/logo-ck.png" alt="CK logo" />
            <div>
              <strong>Cloud Kitchen Admin</strong>
              <span>Kitchen Manager Panel</span>
            </div>
          </a>
          <nav className="navlinks">
            <a href="#overview">Overview</a>
            <a href="#orders">Orders</a>
            <a href="#chefs">Chefs</a>
            <a href="#tickets">Tickets</a>
          </nav>
          <div className="topbar-actions">
            <span className="chip">Manager: {adminUser || "manager"}</span>
            <a className="btn subtle" href="/app.html">Customer Site</a>
            <button className="btn subtle" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        <section className="section" id="overview">
          <div className="section-head">
            <div>
              <p className="kicker">Operations</p>
              <h2>Kitchen Dashboard</h2>
            </div>
            <div className="admin-auth">
              <button className="btn accent" onClick={refreshAll}>Refresh</button>
            </div>
          </div>
          <div className="admin-notice">{notice}</div>
          <div className="kpi-grid">
            {kpis.map(([title, value]) => (
              <article className="kpi-card" key={title}>
                <p>{title}</p>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="orders">
          <div className="section-head">
            <div>
              <p className="kicker">Live queue</p>
              <h2>Order Control Room</h2>
            </div>
            <div className="order-filters">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Preparing">Preparing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input
                type="search"
                placeholder="Search by order/customer/phone"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="admin-orders-grid">
            {orders.length === 0 ? (
              <p>No orders found for this filter.</p>
            ) : (
              orders.map((order) => (
                <article className="admin-order-card" key={order.id}>
                  <h4>{order.id}</h4>
                  <p>
                    <span className="chip">{order.status}</span> <span className="chip">{order.paymentStatus || "Pending"}</span>
                  </p>
                  <p>{order.customerName} ({order.customerPhone})</p>
                  <p>Total: Rs {order.total} | {formatDateTime(order.createdAt)}</p>
                  <p>Chef: {order.assignedChef ? order.assignedChef.name : "Not assigned"}</p>
                  <p>Item assignments: {order.assignedItems || 0}/{order.totalItems || 0}</p>
                  <div className="admin-order-actions">
                    <button className="btn subtle" onClick={() => viewOrder(order.id)}>Details</button>
                    <button className="btn subtle" onClick={() => assignOrderChef(order.id)}>Assign Chef</button>
                    <button className="btn subtle" onClick={() => updateStatus(order.id, "Preparing")}>Preparing</button>
                    <button className="btn subtle" onClick={() => updateStatus(order.id, "Out for Delivery")}>Out for Delivery</button>
                    <button className="btn subtle" onClick={() => updateStatus(order.id, "Delivered")}>Delivered</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section" id="chefs">
          <div className="section-head">
            <div>
              <p className="kicker">Kitchen floor</p>
              <h2>Chef Management</h2>
            </div>
          </div>
          <div className="chef-grid">
            {chefs.length === 0 ? (
              <p>No chef records found.</p>
            ) : (
              chefs.map((chef) => (
                <article className="chef-card" key={chef.id}>
                  <h4>{chef.name}</h4>
                  <p>{chef.station}</p>
                  <div className="chef-row">
                    <span className="chip">{chef.isOnDuty ? "On Duty" : "Off Duty"}</span>
                    <span className="chip">Assigned: {chef.assignedOrders}</span>
                  </div>
                  <button className="btn subtle" onClick={() => toggleChefDuty(chef.id)}>
                    {chef.isOnDuty ? "Set Off Duty" : "Set On Duty"}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="section" id="tickets">
          <div className="section-head">
            <div>
              <p className="kicker">Customer Support</p>
              <h2>Support Inbox</h2>
            </div>
            <div className="order-filters">
              <select value={ticketStatusFilter} onChange={(e) => setTicketStatusFilter(e.target.value)}>
                <option value="">All tickets</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <input
                type="search"
                placeholder="Search ticket/order/customer"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="admin-orders-grid">
            {tickets.length === 0 ? (
              <p>No support tickets found.</p>
            ) : (
              tickets.map((ticket) => (
                <article className="admin-order-card" key={ticket.id}>
                  <h4>{ticket.id}</h4>
                  <p><span className="chip">{ticket.status}</span></p>
                  <p><strong>Order:</strong> {ticket.orderId}</p>
                  <p><strong>Customer:</strong> {ticket.customerName} ({ticket.customerPhone})</p>
                  <p><strong>Query:</strong> {ticket.message}</p>
                  <p><strong>Last update:</strong> {formatDateTime(ticket.managerReplyAt || ticket.createdAt)}</p>
                  <div className="admin-order-actions">
                    <button className="btn subtle" onClick={() => replyTicket(ticket.id, false)}>Reply</button>
                    <button className="btn subtle" disabled={ticket.status === "closed"} onClick={() => replyTicket(ticket.id, true)}>Mark Closed</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {selectedOrder && (
        <div className="backdrop show" onClick={() => setSelectedOrder(null)}>
          <div className="dialog-card order-detail-card" style={{ width: "min(860px, 96vw)", background: "#fff", margin: "4vh auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="order-detail-head">
              <h3>Order {selectedOrder.id}</h3>
              <button className="icon-btn" onClick={() => setSelectedOrder(null)}>X</button>
            </div>
            <div className="detail-block">
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Payment:</strong> {selectedOrder.paymentMode} ({selectedOrder.paymentStatus || "Pending"})</p>
              <p><strong>Customer:</strong> {selectedOrder.customer?.name} | {selectedOrder.customer?.phone}</p>
              <p><strong>Address:</strong> {selectedOrder.customer?.address}</p>
              <p><strong>Total:</strong> Rs {selectedOrder.pricing?.total}</p>
            </div>
            <div className="detail-block">
              <strong>Update Order Status</strong>
              <div className="admin-modal-status-controls">
                <div className="order-actions">
                  <button className="btn subtle" onClick={() => updateStatus(selectedOrder.id, "Preparing", "Updated from order details modal")}>Preparing</button>
                  <button className="btn subtle" onClick={() => updateStatus(selectedOrder.id, "Out for Delivery", "Updated from order details modal")}>Out for Delivery</button>
                  <button className="btn subtle" onClick={() => updateStatus(selectedOrder.id, "Delivered", "Updated from order details modal")}>Delivered</button>
                  <button
                    className="btn subtle"
                    disabled={selectedOrder.status === "Cancelled" || selectedOrder.status === "Delivered"}
                    onClick={() => updateStatus(selectedOrder.id, "Cancelled", "Cancelled by manager from order details")}
                  >
                    Manual Cancel
                  </button>
                </div>
              </div>
            </div>
            <div className="detail-block">
              <strong>Items (Assign chef per item)</strong>
              <ul className="timeline">
                {(selectedOrder.items || []).map((item) => (
                  <li key={item.id}>
                    <div><strong>{item.name}</strong> x {item.quantity}</div>
                    <div className="admin-modal-status-controls">
                      <span className="chip">{item.assignedChef ? `Chef: ${item.assignedChef.chefName}` : "No chef assigned"}</span>
                      <div className="admin-order-actions">
                        <select
                          value={itemChefDraft[item.id] || ""}
                          onChange={(e) => setItemChefDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        >
                          {!onDutyChefs.length && <option value="">No on-duty chef</option>}
                          {onDutyChefs.map((chef) => (
                            <option key={chef.id} value={chef.id}>{chef.name} ({chef.station})</option>
                          ))}
                        </select>
                        <button className="btn subtle" onClick={() => assignChefToItem(selectedOrder.id, item.id)}>Assign Chef</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="detail-block">
              <strong>Status Timeline</strong>
              <ul className="timeline">
                {(selectedOrder.statusHistory || []).map((entry, idx) => (
                  <li key={`${entry.status}-${idx}`}>{entry.status} - {formatDateTime(entry.at)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDateTime(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

ReactDOM.createRoot(document.getElementById("adminRoot")).render(<AdminApp />);
