import { useEffect, useMemo, useRef, useState } from "react";

function CustomSelect({ value, onChange, options, className, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || value || "Select...";

  return (
    <div className={`custom-select-wrap ${className || ""} ${disabled ? "disabled" : ""}`} ref={containerRef} style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.6 : 1 }}>
      <div className={`select-trigger ${isOpen ? "active" : ""}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
        <span>{selectedLabel}</span>
        <span className="select-chevron">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </span>
      </div>
      {isOpen && (
        <div className="select-options-card">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              className={`select-option ${String(opt.value) === String(value) ? "selected" : ""}`}
              onClick={() => { onChange({ target: { value: opt.value } }); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS = ["Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
const VIEWS = {
  TODAY: "today",
  PAST_ORDERS: "past-orders",
  PAST_TICKETS: "past-tickets",
  ANALYTICS: "analytics",
  MENU: "menu"
};

export function AdminApp() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem("ck_admin_key") || "");
  const [adminUser] = useState(localStorage.getItem("ck_admin_user") || "");
  const [notice, setNotice] = useState("");
  const [metrics, setMetrics] = useState({});
  const [orders, setOrders] = useState([]);
  const [chefs, setChefs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [itemChefMap, setItemChefMap] = useState({});
  const [itemAssignGlow, setItemAssignGlow] = useState({});
  const [authRequired, setAuthRequired] = useState(!localStorage.getItem("ck_admin_key"));
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [menuList, setMenuList] = useState([]);
  const [isSavingMenu, setIsSavingMenu] = useState({});
  const [apiBase, setApiBase] = useState(window.location.origin);
  const [view, setView] = useState(() => {
    try {
      const url = new URL(window.location.href);
      const v = String(url.searchParams.get("view") || "").trim().toLowerCase();
      if (v === VIEWS.PAST_ORDERS) return VIEWS.PAST_ORDERS;
      if (v === VIEWS.PAST_TICKETS) return VIEWS.PAST_TICKETS;
      if (v === VIEWS.ANALYTICS) return VIEWS.ANALYTICS;
      return VIEWS.TODAY;
    } catch {
      return VIEWS.TODAY;
    }
  });
  const [pastPreset, setPastPreset] = useState("last7");
  const [pastFrom, setPastFrom] = useState("");
  const [pastTo, setPastTo] = useState("");
  const [analyticsPreset, setAnalyticsPreset] = useState("last7");
  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [trendGroup, setTrendGroup] = useState("day");

  const onDutyChefs = useMemo(() => chefs.filter((c) => c.isOnDuty), [chefs]);
  const activeChefs = useMemo(() => chefs.filter((c) => c.isActive !== false), [chefs]);

  const todaysOrders = useMemo(() => {
    return orders
      .filter((o) => isToday(o.createdAt))
      .filter((o) => {
        if (statusFilter && o.status !== statusFilter) return false;
        if (paymentStatusFilter && o.paymentStatus !== paymentStatusFilter) return false;
        const q = String(orderSearch || "").trim().toLowerCase();
        if (q) {
          const hay = `${o.id} ${o.customerName || ""} ${o.customerPhone || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === "Cancelled" && b.status !== "Cancelled") return 1;
        if (a.status !== "Cancelled" && b.status === "Cancelled") return -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [orders, statusFilter, paymentStatusFilter, orderSearch]);
  const pastOrders = useMemo(() => orders.filter((o) => !isToday(o.createdAt)), [orders]);
  const todaysTickets = useMemo(() => tickets.filter((t) => isToday(t.createdAt)), [tickets]);
  const pastTickets = useMemo(() => tickets.filter((t) => !isToday(t.createdAt)), [tickets]);

  const pastRange = useMemo(() => computePastRange(pastPreset, pastFrom, pastTo), [pastPreset, pastFrom, pastTo]);
  const filteredPastOrders = useMemo(
    () =>
      pastOrders
        .filter((o) => isWithinRange(o.createdAt, pastRange))
        .filter((o) => {
          if (statusFilter && o.status !== statusFilter) return false;
          if (paymentStatusFilter && o.paymentStatus !== paymentStatusFilter) return false;
          const q = String(orderSearch || "").trim().toLowerCase();
          if (!q) return true;
          const hay = `${o.id} ${o.customerName || ""} ${o.customerPhone || ""}`.toLowerCase();
          return hay.includes(q);
        }),
    [pastOrders, pastRange, orderSearch, statusFilter, paymentStatusFilter]
  );
  const filteredPastTickets = useMemo(
    () =>
      pastTickets
        .filter((t) => isWithinRange(t.createdAt, pastRange))
        .filter((t) => {
          const q = String(ticketSearch || "").trim().toLowerCase();
          if (!q) return true;
          const hay = `${t.id} ${t.orderId || ""} ${t.customerName || ""} ${t.customerPhone || ""} ${t.message || ""}`.toLowerCase();
          return hay.includes(q);
        }),
    [pastTickets, pastRange, ticketSearch]
  );

  useEffect(() => {
    resolveApiBase();
  }, []);

  useEffect(() => {
    if (!adminKey) {
      setAuthRequired(true);
      return;
    }
    if (!apiBase) return;
    setAuthRequired(false);
    refreshAll();
    const timer = setInterval(refreshAll, 15000);
    return () => clearInterval(timer);
  }, [adminKey, apiBase, statusFilter, orderSearch, ticketStatus, ticketSearch]);

  useEffect(() => {
    // keep URL shareable without adding a full router
    try {
      const url = new URL(window.location.href);
      if (view === VIEWS.TODAY) url.searchParams.delete("view");
      else url.searchParams.set("view", view);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // no-op
    }
  }, [view]);

  useEffect(() => {
    if (!adminKey || !apiBase) return;
    if (view === VIEWS.ANALYTICS) loadAnalytics();
    if (view === VIEWS.MENU) loadAdminMenu();
  }, [view, adminKey, apiBase, analyticsPreset, analyticsFrom, analyticsTo]);

  useEffect(() => {
    if (!activeOrder) return;
    const nextMap = {};
    for (const item of activeOrder.items || []) {
      nextMap[item.id] = item.assignedChef?.chefId || "";
    }
    setItemChefMap(nextMap);
  }, [activeOrder, activeChefs]);

  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const tag = String(target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select" || Boolean(target?.isContentEditable);

      if (event.key === "Escape" && activeOrder) {
        event.preventDefault();
        setActiveOrder(null);
        return;
      }

      if (event.altKey && event.key === "1") {
        event.preventDefault();
        document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (event.altKey && event.key === "2") {
        event.preventDefault();
        document.getElementById("orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (event.altKey && event.key === "3") {
        event.preventDefault();
        document.getElementById("chefs")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (event.altKey && event.key === "4") {
        event.preventDefault();
        document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (event.altKey && (event.key === "r" || event.key === "R")) {
        event.preventDefault();
        refreshAll();
        return;
      }

      if (activeOrder && event.key === "Enter" && tag === "select" && target?.dataset?.itemId) {
        event.preventDefault();
        const itemId = target.dataset.itemId;
        assignChefToItem(activeOrder.id, itemId);
        return;
      }

      if (isTyping) return;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeOrder, itemChefMap, adminKey, apiBase, statusFilter, orderSearch, ticketStatus, ticketSearch]);

  async function resolveApiBase() {
    const envBase = import.meta.env.VITE_API_BASE;
    const uniqueCandidates = [...new Set([envBase, window.location.origin, "http://localhost:3001", "http://localhost:3000"].filter(Boolean))];
    for (const base of uniqueCandidates) {
      try {
        const res = await fetch(`${base}/api/admin/tickets`, {
          method: "GET",
          headers: { "x-admin-key": localStorage.getItem("ck_admin_key") || "probe-key" }
        });
        if (res.status === 200 || res.status === 401) {
          setApiBase(base);
          return base;
        }
      } catch {
        // Try next candidate
      }
    }
    setApiBase(window.location.origin);
    return window.location.origin;
  }

  async function api(path, options = {}) {
    const url = path.startsWith("http") ? path : `${apiBase}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
        ...(options.headers || {})
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  async function loadAnalytics() {
    try {
      const range = computePastRange(analyticsPreset, analyticsFrom, analyticsTo);
      const q = new URLSearchParams();
      if (range?.from) q.set("from", range.from.toISOString());
      if (range?.to) q.set("to", range.to.toISOString());

      // Auto-detect granularity
      let actualGroup = trendGroup;
      if (range?.from && range?.to) {
        const diff = Math.abs(range.to - range.from) / (1000 * 60 * 60 * 24);
        if (diff <= 1.1 && trendGroup === "day") actualGroup = "hour";
      }
      q.set("groupBy", actualGroup);

      const data = await api(`/api/admin/analytics?${q.toString()}`);
      setAnalytics(data);
      setNotice("Analytics updated.");
    } catch (error) {
      setAnalytics(null);
      setNotice(`Unable to load analytics: ${error.message}`);
    }
  }

  async function loadAdminMenu() {
    try {
      const data = await api("/api/admin/menu");
      setMenuList(data.items || []);
      setNotice("Menu items loaded.");
    } catch (error) {
      setNotice(`Unable to load menu: ${error.message}`);
    }
  }

  async function updateMenuItem(itemId, updates) {
    setIsSavingMenu(prev => ({ ...prev, [itemId]: true }));
    try {
      await api(`/api/admin/menu/${itemId}`, {
        method: "POST",
        body: JSON.stringify(updates)
      });
      setNotice("Item updated successfully.");
      await loadAdminMenu();
    } catch (error) {
      setNotice(`Failed to update item: ${error.message}`);
    } finally {
      setIsSavingMenu(prev => ({ ...prev, [itemId]: false }));
    }
  }

  const filterToday = (status = "", payment = "") => {
    setView(VIEWS.TODAY);
    setStatusFilter(status);
    setPaymentStatusFilter(payment);
    setTimeout(() => {
      document.getElementById("orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const scrollToChefs = () => {
    setView(VIEWS.TODAY);
    setTimeout(() => {
      document.getElementById("chefs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const scrollToTickets = () => {
    setView(VIEWS.TODAY);
    setTimeout(() => {
      document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  async function refreshAll() {
    try {
      const orderParams = new URLSearchParams();
      if (statusFilter) orderParams.set("status", statusFilter);
      if (paymentStatusFilter) orderParams.set("paymentStatus", paymentStatusFilter);
      if (orderSearch) orderParams.set("search", orderSearch);

      const ticketParams = new URLSearchParams();
      if (ticketStatus) ticketParams.set("status", ticketStatus);
      if (ticketSearch) ticketParams.set("search", ticketSearch);

      const [overview, ordersData, chefsData, ticketsData] = await Promise.all([
        api("/api/admin/overview"),
        api(`/api/admin/orders?${orderParams.toString()}`),
        api("/api/admin/chefs"),
        api(`/api/admin/tickets?${ticketParams.toString()}`)
      ]);

      setMetrics(overview.metrics || {});
      setOrders(ordersData.orders || []);
      setChefs(chefsData.chefs || []);
      setTickets(ticketsData.tickets || []);
      setNotice("Dashboard synced.");
    } catch (error) {
      if (String(error.message || "").toLowerCase().includes("invalid admin key")) {
        localStorage.removeItem("ck_admin_key");
        localStorage.removeItem("ck_admin_user");
        setAdminKey("");
        setAuthRequired(true);
        return;
      }
      setNotice(`Unable to sync dashboard: ${error.message}`);
    }
  }

  async function openOrder(orderId) {
    try {
      const data = await api(`/api/orders/${orderId}`);
      setActiveOrder(data.order || null);
    } catch (error) {
      setNotice(error.message || "Unable to load order.");
    }
  }

  async function requestUpiForRefund(order) {
    try {
      // Corrected ticket lookup to use admin search endpoint
      const data = await api(`/api/admin/tickets?search=${order.id}`);
      const tickets = data.tickets || [];
      let ticketId;
      if (tickets.length) {
        ticketId = tickets[0].id;
      } else {
        const newTicket = await api("/api/support/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, message: "System initiated refund request." })
        });
        ticketId = newTicket.ticketId;
      }

      await api(`/api/support/tickets/${ticketId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "[ACTION:PROVIDE_UPI_FOR_REFUND] Please provide your UPI ID here to receive your refund.", authorName: "Manager" })
      });
      
      alert("Refund request sent to customer via support thread.");
    } catch (e) {
      alert("Failed to initiate refund request: " + e.message);
    }
  }

  async function markOrderRefunded(orderId) {
    const refundRef = prompt("Enter Refund Transaction/Reference ID:");
    if (!refundRef) return;
    try {
      await api(`/api/admin/orders/${orderId}/mark-refunded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundRef })
      });
      alert(`Order ${orderId} marked as Refunded.`);
      refreshAll();
      if (activeOrder?.id === orderId) openOrder(orderId);
    } catch (e) {
      alert("Failed to mark as refunded: " + e.message);
    }
  }

  async function updateOrderStatus(orderId, status, note = "Updated by manager dashboard") {
    try {
      await api(`/api/admin/orders/${orderId}/status`, {
        method: "POST",
        body: JSON.stringify({ status, note })
      });
      setNotice(`Order ${orderId} -> ${status}`);
      await refreshAll();
      if (activeOrder?.id === orderId) await openOrder(orderId);
    } catch (error) {
      setNotice(error.message || "Status update failed.");
    }
  }
  async function verifyOrderPayment(orderId, approve, note = "", paymentRef = "") {
    try {
      const data = await api(`/api/admin/orders/${orderId}/payment-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminKey}` },
        body: JSON.stringify({ approve, note, paymentRef })
      });
      flash(approve ? "Payment verified" : "Payment rejected");
      refreshAll();
      if (activeOrder?.id === orderId) {
        setActiveOrder(data.order);
      }
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function approveCancellation(orderId, approved) {
    try {
      const data = await api(`/api/admin/orders/${orderId}/verify-cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${adminKey}` },
        body: JSON.stringify({ approved })
      });
      flash(approved ? "Order cancelled and fee verified" : "Cancellation request rejected");
      refreshAll();
      if (activeOrder?.id === orderId) {
        setActiveOrder(data.order);
      }
    } catch (err) {
      flash(err.message, "error");
    }
  }

  async function updateCodPaymentStatus(orderId, paymentStatus) {
    try {
      const paymentRef = paymentStatus === "Paid" ? `COD-${Date.now()}` : "";
      await api(`/api/admin/orders/${orderId}/payment-status`, {
        method: "POST",
        body: JSON.stringify({ paymentStatus, paymentRef })
      });
      setNotice(`Payment status updated: ${paymentStatus}`);
      await refreshAll();
      if (activeOrder?.id === orderId) await openOrder(orderId);
    } catch (error) {
      setNotice(error.message || "Payment status update failed.");
    }
  }

  async function assignChefToItem(orderId, itemId) {
    const chefId = itemChefMap[itemId];
    if (!chefId) return setNotice("Select a chef first.");
    try {
      await api(`/api/admin/orders/${orderId}/items/${itemId}/assign-chef`, {
        method: "POST",
        body: JSON.stringify({ chefId })
      });
      setNotice("Item chef assigned.");
      setItemAssignGlow((prev) => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setItemAssignGlow((prev) => ({ ...prev, [itemId]: false }));
      }, 1600);
      await refreshAll();
      await openOrder(orderId);
    } catch (error) {
      setNotice(error.message || "Item assignment failed.");
    }
  }

  async function toggleDuty(chefId) {
    try {
      const data = await api(`/api/admin/chefs/${chefId}/toggle-duty`, { method: "POST" });
      setNotice(`Chef ${data.chef.name} duty updated.`);
      await refreshAll();
    } catch (error) {
      setNotice(error.message || "Chef update failed.");
    }
  }


  async function replyTicket(ticketId, closeTicket) {
    const message = prompt(
      closeTicket ? "Closing reply:" : "Reply to customer:",
      closeTicket ? "Issue resolved. Thank you." : "We are checking this right away."
    );
    if (!message) return;
    try {
      await api(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message, closeTicket, adminName: adminUser || "manager" })
      });
      setNotice(`Ticket ${ticketId} updated.`);
      await refreshAll();
    } catch (error) {
      setNotice(error.message || "Ticket reply failed.");
    }
  }

  function logout() {
    localStorage.removeItem("ck_admin_key");
    localStorage.removeItem("ck_admin_user");
    setAdminKey("");
    setAuthRequired(true);
  }

  async function loginFromReact(event) {
    event.preventDefault();
    const username = loginUsername.trim();
    const password = loginPassword;
    if (!username || !password) {
      setLoginNotice("Enter username and password.");
      return;
    }
    setIsLoggingIn(true);
    setLoginNotice("");
    try {
      const detectedBase = await resolveApiBase();
      const res = await fetch(`${detectedBase}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginNotice(data.message || "Admin login failed.");
        return;
      }
      localStorage.setItem("ck_admin_key", data.adminKey);
      localStorage.setItem("ck_admin_user", data.admin?.username || username);
      setAdminKey(data.adminKey);
      setAuthRequired(false);
      setLoginPassword("");
      setLoginNotice("Login successful.");
    } catch {
      setLoginNotice("Unable to reach backend. Ensure Postgres server is running.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (authRequired) {
    return (
      <div className="admin-root">
        <div className="container" style={{ paddingTop: "3rem" }}>
          <article className="kpi-card" style={{ maxWidth: "560px" }}>
            <h2 style={{ marginTop: 0 }}>Admin Session Required</h2>
            <p style={{ marginBottom: "1rem" }}>Login here to continue on React admin dashboard.</p>
            <form onSubmit={loginFromReact} className="order-filters" style={{ marginBottom: "0.7rem" }}>
              <input
                type="text"
                placeholder="Manager username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Manager password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <button className="btn accent" type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? "Logging in..." : "Admin Login"}
              </button>
            </form>
            <p style={{ margin: 0, color: loginNotice.toLowerCase().includes("successful") ? "#2a6a2a" : "#7a3b1c" }}>{loginNotice}</p>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <header className="topbar">
        <div className="topbar-inner container">
          <a className="brand" href="#">
            <img src="/assets/logo-ck.png" alt="CK logo" />
            <div>
              <strong>Cloud Kitchen Admin</strong>
              <span>Kitchen Manager Panel</span>
            </div>
          </a>
          <nav className="navlinks">
            <button
              type="button"
              className="btn subtle"
              onClick={() => {
                setView(VIEWS.TODAY);
                document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Today
            </button>
            <button
              type="button"
              className="btn subtle"
              onClick={() => {
                setView(VIEWS.PAST_ORDERS);
                document.getElementById("past-orders")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Past Orders
            </button>
            <button
              type="button"
              className="btn subtle"
              onClick={() => {
                setView(VIEWS.PAST_TICKETS);
                document.getElementById("past-tickets")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Past Tickets
            </button>
            <button
              type="button"
              className="btn subtle"
              onClick={() => {
                setView(VIEWS.ANALYTICS);
                document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Analytics
            </button>
          </nav>
          <div className="topbar-actions">
            <span className="chip">Manager: {adminUser || "manager"}</span>
            <button 
              type="button" 
              className={`btn subtle ${view === VIEWS.MENU ? 'accent' : ''}`} 
              onClick={() => {
                setView(VIEWS.MENU);
                document.getElementById("menu-management")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Manage Menu
            </button>
            <button className="btn subtle" onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        <section className="section" id="overview">
          <div className="section-head">
            <div>
              <p className="kicker">Operations</p>
              <h2>{view === VIEWS.TODAY ? "Kitchen Dashboard (Today)" : "Kitchen Dashboard"}</h2>
            </div>
            <button className="btn accent" onClick={refreshAll}>Refresh</button>
          </div>
          <div className="admin-notice">{notice}</div>
          <div className="kpi-grid">
            <Kpi title="Today's Orders" value={metrics.total_orders || 0} onClick={() => filterToday("", "")} />
            <Kpi title="Active Orders" value={metrics.active_orders || 0} onClick={() => filterToday("", "")} />
            <Kpi title="Delivered Today" value={metrics.delivered_orders || 0} onClick={() => filterToday("Delivered")} />
            <Kpi title="Cancelled Today" value={metrics.cancelled_orders || 0} onClick={() => filterToday("Cancelled")} />
            <Kpi title="Pending Payments" value={metrics.pending_payments || 0} onClick={() => filterToday("", "Pending")} />
            <Kpi title="Pending Verification" value={metrics.pending_verifications || 0} onClick={() => filterToday("", "Verification Pending")} />
            <Kpi title="Revenue Today" value={`Rs ${metrics.gross_revenue || 0}`} onClick={() => setView(VIEWS.ANALYTICS)} />
            <Kpi title="Chefs On Duty" value={`${metrics.on_duty_chefs || 0}/${metrics.total_chefs || 0}`} onClick={scrollToChefs} />
            <Kpi title="Open Tickets" value={metrics.open_tickets || 0} onClick={scrollToTickets} />
          </div>
        </section>

        {view === VIEWS.TODAY ? (
          <section className="section" id="orders">
            <div className="section-head">
              <div>
                <p className="kicker">Live queue</p>
                <h2>Today’s Orders</h2>
              </div>
              <div className="order-filters">
                <CustomSelect 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)} 
                  options={[{ label: "All statuses", value: "" }, ...STATUS_OPTIONS.map(s => ({ label: s, value: s }))]} 
                />
                <CustomSelect 
                  value={paymentStatusFilter} 
                  onChange={(e) => setPaymentStatusFilter(e.target.value)} 
                  options={[
                    { label: "All payment", value: "" },
                    { label: "Pending", value: "Pending" },
                    { label: "Verification Pending", value: "Verification Pending" },
                    { label: "Paid", value: "Paid" },
                    { label: "COD", value: "Pay on Delivery" },
                    { label: "Refunded", value: "Refunded" }
                  ]} 
                />
                <input
                  type="search"
                  placeholder="Search by order/customer/phone"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
                <button className="btn subtle" type="button" onClick={() => setView(VIEWS.PAST_ORDERS)}>
                  View past orders
                </button>
              </div>
            </div>
            <div className="admin-orders-grid-horizontal">
              {!todaysOrders.length ? <p>No orders found for today.</p> : todaysOrders.map((order) => {
                const isCancelled = order.status === "Cancelled";
                return (
                  <article 
                    className={`admin-order-card-horizontal ${isCancelled ? 'cancelled' : ''} ${order.status === 'Delivered' ? 'delivered' : ''} ${order.status === 'Cancellation Requested' ? 'cancellation-pending' : ''}`} 
                    key={order.id}
                    onClick={() => openOrder(order.id)}
                  >
                    <div className="card-left">
                      <div className="order-id">#{order.id.slice(-6)}</div>
                      <div className="order-meta">
                        <span className={`status-chip ${order.status.toLowerCase().replace(/ /g, '-')}`}>{order.status}</span>
                        <span className={`status-chip ${order.paymentStatus?.toLowerCase() || 'pending'}`}>{order.paymentStatus || "Pending"}</span>
                      </div>
                    </div>
                    
                    <div className="card-center">
                      <div className="cust-info">
                        <strong>{order.customerName || "Guest"}</strong>
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="order-summary">
                        Rs {order.total} • {fmt(order.createdAt)}
                      </div>
                    </div>

                    <div className="card-right">
                      <div className="quick-actions">
                        <CustomSelect 
                          className="status-select" 
                          value={order.status} 
                          onChange={(e) => updateOrderStatus(order.id, e.target.value, "Quick update from dashboard")}
                          disabled={isCancelled || order.status === "Delivered"}
                          options={STATUS_OPTIONS.map(s => ({ label: s, value: s }))}
                        />
                        <button className="btn subtle small" onClick={() => openOrder(order.id)}>Details</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {view === VIEWS.PAST_ORDERS ? (
          <section className="section" id="past-orders">
            <div className="section-head">
              <div>
                <p className="kicker">History</p>
                <h2>Past Orders</h2>
              </div>
              <div className="order-filters">
                <CustomSelect 
                  value={pastPreset} 
                  onChange={(e) => setPastPreset(e.target.value)} 
                  options={[
                    { label: "Yesterday", value: "yesterday" },
                    { label: "Last 7 days", value: "last7" },
                    { label: "Last 30 days", value: "last30" },
                    { label: "Custom range", value: "custom" }
                  ]}
                />
                <input
                  type="date"
                  value={pastFrom}
                  onChange={(e) => setPastFrom(e.target.value)}
                  disabled={pastPreset !== "custom"}
                  title="From date"
                />
                <input
                  type="date"
                  value={pastTo}
                  onChange={(e) => setPastTo(e.target.value)}
                  disabled={pastPreset !== "custom"}
                  title="To date"
                />
                <input
                  type="search"
                  placeholder="Search by order/customer/phone"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
                <button className="btn subtle" type="button" onClick={() => setView(VIEWS.TODAY)}>
                  Back to today
                </button>
              </div>
            </div>
            <div className="admin-orders-grid">
              {!filteredPastOrders.length ? <p>No past orders found for the selected range.</p> : filteredPastOrders.map((order) => (
              <article className="admin-order-card" key={order.id}>
                <h4>{order.id}</h4>
                <p><span className="chip">{order.status}</span> <span className="chip">{order.paymentStatus || "Pending"}</span></p>
                <p>{order.customerName} ({order.customerPhone})</p>
                <p>Total: Rs {order.total} | {fmt(order.createdAt)}</p>
                <p>Chef: {order.assignedChef?.name || "Not assigned"}</p>
                <p>Item assignments: {order.assignedItems || 0}/{order.totalItems || 0}</p>
                <div className="admin-order-actions">
                  <button className="btn subtle" onClick={() => openOrder(order.id)}>Details</button>
                </div>
                {order.status === "Cancelled" && order.paymentStatus === "Paid" && (
                  <div className="refund-alert">
                    ⚠️ REFUND/REVOKE ACTION REQUIRED
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                      <button className="btn small accent" onClick={() => requestUpiForRefund(order)}>Request UPI for Refund</button>
                      <button className="btn small subtle" onClick={() => markOrderRefunded(order.id)}>Mark Refunded</button>
                    </div>
                  </div>
                )}
              </article>
              ))}
            </div>
          </section>
        ) : null}

        {view === VIEWS.TODAY ? (
          <section className="section" id="chefs">
          <div className="section-head"><div><p className="kicker">Kitchen floor</p><h2>Chef Management</h2></div></div>
          <div className="chef-grid">
            {!chefs.length ? <p>No chef records found.</p> : chefs.map((chef) => (
              <article className={`chef-card ${chef.isOnDuty ? "" : "off-duty"}`} key={chef.id}>
                <h4>{chef.name}</h4>
                <p>{chef.station}</p>
                <div className="chef-row">
                  <span className="chip">{chef.isOnDuty ? "On Duty" : "Off Duty"}</span>
                  <span className="chip">Assigned: {chef.assignedOrders}</span>
                </div>
                <button className="btn subtle" onClick={() => toggleDuty(chef.id)}>{chef.isOnDuty ? "Set Off Duty" : "Set On Duty"}</button>
              </article>
            ))}
          </div>
          </section>
        ) : null}

        {view === VIEWS.TODAY ? (
          <section className="section" id="tickets">
            <div className="section-head">
              <div><p className="kicker">Customer Support</p><h2>Today’s Tickets</h2></div>
              <div className="order-filters">
                <CustomSelect 
                  value={ticketStatus} 
                  onChange={(e) => setTicketStatus(e.target.value)} 
                  options={[
                    { label: "All tickets", value: "" },
                    { label: "Open", value: "open" },
                    { label: "Closed", value: "closed" }
                  ]}
                />
                <input type="search" placeholder="Search ticket/order/customer" value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)} />
                <button className="btn subtle" type="button" onClick={() => setView(VIEWS.PAST_TICKETS)}>
                  View past tickets
                </button>
              </div>
            </div>
            <div className="admin-orders-grid">
              {!todaysTickets.length ? <p>No tickets found for today.</p> : todaysTickets.map((ticket) => (
                <article className="admin-order-card" key={ticket.id}>
                  <h4>{ticket.id}</h4>
                  <p><span className="chip">{ticket.status}</span></p>
                  <p><strong>Order:</strong> {ticket.orderId}</p>
                  <p><strong>Customer:</strong> {ticket.customerName} ({ticket.customerPhone})</p>
                  <p><strong>Query:</strong> {ticket.message}</p>
                  <div className="ticket-thread">
                    {(ticket.replies || []).length ? (
                      ticket.replies.map((reply, idx) => (
                        <div className="ticket-reply" key={`${ticket.id}-${idx}`}>
                          <strong>{reply.authorType === "admin" ? (reply.authorName || "Manager") : (reply.authorName || "Customer")}:</strong>
                          <span>{reply.message}</span>
                          <em>{fmt(reply.at)}</em>
                        </div>
                      ))
                    ) : (
                      <p className="ticket-empty">No thread yet.</p>
                    )}
                  </div>
                  <div className="admin-order-actions">
                    <button className="btn subtle" onClick={() => replyTicket(ticket.id, false)}>Reply</button>
                    <button className="btn subtle" disabled={ticket.status === "closed"} onClick={() => replyTicket(ticket.id, true)}>Mark Closed</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {view === VIEWS.PAST_TICKETS ? (
          <section className="section" id="past-tickets">
            <div className="section-head">
              <div><p className="kicker">History</p><h2>Past Tickets</h2></div>
              <div className="order-filters">
                <CustomSelect 
                  value={pastPreset} 
                  onChange={(e) => setPastPreset(e.target.value)} 
                  options={[
                    { label: "Yesterday", value: "yesterday" },
                    { label: "Last 7 days", value: "last7" },
                    { label: "Last 30 days", value: "last30" },
                    { label: "Custom range", value: "custom" }
                  ]}
                />
                <input
                  type="date"
                  value={pastFrom}
                  onChange={(e) => setPastFrom(e.target.value)}
                  disabled={pastPreset !== "custom"}
                  title="From date"
                />
                <input
                  type="date"
                  value={pastTo}
                  onChange={(e) => setPastTo(e.target.value)}
                  disabled={pastPreset !== "custom"}
                  title="To date"
                />
                <input type="search" placeholder="Search ticket/order/customer" value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)} />
                <button className="btn subtle" type="button" onClick={() => setView(VIEWS.TODAY)}>
                  Back to today
                </button>
              </div>
            </div>
            <div className="admin-orders-grid">
              {!filteredPastTickets.length ? <p>No past tickets found for the selected range.</p> : filteredPastTickets.map((ticket) => (
              <article className="admin-order-card" key={ticket.id}>
                <h4>{ticket.id}</h4>
                <p><span className="chip">{ticket.status}</span></p>
                <p><strong>Order:</strong> {ticket.orderId}</p>
                <p><strong>Customer:</strong> {ticket.customerName} ({ticket.customerPhone})</p>
                <p><strong>Query:</strong> {ticket.message}</p>
                <div className="ticket-thread">
                  {(ticket.replies || []).length ? (
                    ticket.replies.map((reply, idx) => (
                      <div className="ticket-reply" key={`${ticket.id}-${idx}`}>
                        <strong>{reply.authorType === "admin" ? (reply.authorName || "Manager") : (reply.authorName || "Customer")}:</strong>
                        <span>{reply.message}</span>
                        <em>{fmt(reply.at)}</em>
                      </div>
                    ))
                  ) : (
                    <p className="ticket-empty">No thread yet.</p>
                  )}
                </div>
                <div className="admin-order-actions">
                  <button className="btn subtle" onClick={() => replyTicket(ticket.id, false)}>Reply</button>
                  <button className="btn subtle" disabled={ticket.status === "closed"} onClick={() => replyTicket(ticket.id, true)}>Mark Closed</button>
                </div>
              </article>
              ))}
            </div>
          </section>
        ) : null}

        {view === VIEWS.ANALYTICS ? (
          <section className="section" id="analytics">
            <div className="section-head" style={{ marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'sticky', top: '1rem', zIndex: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--accent)', color: '#fff', padding: '0.8rem', borderRadius: '12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Analytics Dashboard</h2>
                  <p className="kicker" style={{ marginTop: '0.2rem' }}>Performance Overview</p>
                </div>
              </div>
              <div className="order-filters" style={{ flex: 1, justifyContent: 'flex-end', gap: '0.8rem' }}>
                <CustomSelect 
                  value={analyticsPreset} 
                  onChange={(e) => setAnalyticsPreset(e.target.value)} 
                  options={[
                    { label: "Yesterday", value: "yesterday" },
                    { label: "Last 7 days", value: "last7" },
                    { label: "Last 30 days", value: "last30" },
                    { label: "Custom range", value: "custom" }
                  ]}
                />
                {analyticsPreset === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={analyticsFrom}
                      onChange={(e) => setAnalyticsFrom(e.target.value)}
                      title="From date"
                    />
                    <input
                      type="date"
                      value={analyticsTo}
                      onChange={(e) => setAnalyticsTo(e.target.value)}
                      title="To date"
                    />
                  </>
                )}
                <button className="btn" type="button" onClick={loadAnalytics} style={{ padding: '0.6rem 1.2rem' }}>
                  Apply Filters
                </button>
              </div>
            </div>

            {!analytics?.ok ? (
              <p>No analytics data loaded yet.</p>
            ) : (
              <>
                <div className="kpi-grid" style={{ marginTop: "0.7rem" }}>
                  <Kpi title="Total Orders" value={analytics.summary?.orders || 0} />
                  <Kpi title="Total Revenue" value={`Rs ${analytics.summary?.revenue || 0}`} />
                  <Kpi title="Avg Order Value" value={`Rs ${analytics.summary?.aov || 0}`} />
                  <Kpi title="Delivered" value={analytics.summary?.delivered || 0} />
                  <Kpi title="Cancelled" value={analytics.summary?.cancelled || 0} />
                  <Kpi title="Pending Payments" value={analytics.summary?.pendingPayments || 0} />
                </div>

                {/* Main Trend Chart */}
                <div style={{ marginTop: "1.2rem" }}>
                  <ChartCard 
                    title="Revenue Trend" 
                    subtitle="Track growth over time"
                    extra={(
                      <div className="order-filters" style={{ border: 'none', padding: 0 }}>
                        <select 
                          className="subtle-select"
                          value={trendGroup} 
                          onChange={(e) => {
                            setTrendGroup(e.target.value);
                            // We need to re-load with the new granularity
                            setTimeout(loadAnalytics, 10);
                          }}
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--line)' }}
                        >
                          <option value="hour">Hourly</option>
                          <option value="day">Daily</option>
                          <option value="week">Weekly</option>
                          <option value="month">Monthly</option>
                        </select>
                      </div>
                    )}
                  >
                    <LineChart 
                      color="#3b82f6"
                      data={!analytics.dailyTrends?.length ? [] : analytics.dailyTrends.map(d => {
                        const date = new Date(d.date);
                        const group = analytics.groupBy || trendGroup;
                        let label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        if (group === 'hour') {
                          label = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                        } else if (group === 'week') {
                          label = `Week of ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
                        } else if (group === 'month') {
                          label = date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                        }
                        return { label, value: d.revenue };
                      })} 
                      valueSuffix=" Rs"
                    />
                    {!analytics.dailyTrends?.length && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--muted)', fontSize: '0.9rem' }}>
                        No trend data for this period.
                      </div>
                    )}
                  </ChartCard>
                </div>

                <div className="analytics-section-grid">
                  <ChartCard title="Order Status" subtitle="Fulfillment breakdown">
                    <DonutChart 
                      data={(analytics.statuses || []).map(s => ({ label: s.status, value: s.count }))} 
                      centerTitle={analytics.summary?.orders || 0}
                      centerLabel="Orders"
                    />
                  </ChartCard>
                  
                  <ChartCard title="Category Distribution" subtitle="Top selling categories">
                    <DonutChart 
                      data={(analytics.categoryDist || []).map(c => ({ label: c.category, value: c.qty }))} 
                      centerTitle={analytics.categoryDist?.length || 0}
                      centerLabel="Items"
                    />
                  </ChartCard>

                  <ChartCard title="Customer Insights" subtitle="New vs Returning">
                    <div style={{ padding: '1rem 0' }}>
                      <div className="detail-block" style={{ marginBottom: '1rem', textAlign: 'center' }}>
                        <div className="kicker">Retention Rate</div>
                        <h2 style={{ color: 'var(--accent)', fontSize: '2.4rem', margin: '0.4rem 0' }}>
                          {analytics.customerStats?.new_customers ? 
                            Math.round((analytics.customerStats.returning_customers / (analytics.customerStats.new_customers + analytics.customerStats.returning_customers)) * 100) : 0}%
                        </h2>
                      </div>
                      <table className="perf-table">
                        <tbody>
                          <tr>
                            <td className="perf-name">New Customers</td>
                            <td className="perf-val">{analytics.customerStats?.new_customers || 0}</td>
                          </tr>
                          <tr>
                            <td className="perf-name">Returning</td>
                            <td className="perf-val">{analytics.customerStats?.returning_customers || 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                </div>

                <div className="analytics-grid" style={{ marginTop: "1rem" }}>
                  <ChartCard title="Peak Hours" subtitle="Orders by hour of day">
                    <BarChart
                      data={(analytics.hourly || []).map((h) => ({
                        key: String(h.hour).padStart(2, "0"),
                        label: `${String(h.hour).padStart(2, "0")}:00`,
                        value: Number(h.count || 0)
                      }))}
                      valueSuffix=" orders"
                    />
                  </ChartCard>

                  <ChartCard title="Chef Performance" subtitle="Items handled by kitchen staff">
                    <div style={{ marginTop: '0.5rem' }}>
                      {!analytics.chefPerf?.length ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>
                          <p>No chef performance data available for this period.</p>
                        </div>
                      ) : (
                        <table className="perf-table">
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--line)' }}>
                              <th align="left" style={{ padding: '0.5rem 0', fontSize: '0.8rem', color: 'var(--muted)' }}>CHEF NAME</th>
                              <th align="right" style={{ padding: '0.5rem 0', fontSize: '0.8rem', color: 'var(--muted)' }}>ITEMS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.chefPerf.map((c, i) => (
                              <tr key={i}>
                                <td className="perf-name">{c.name}</td>
                                <td className="perf-val">{c.items_handled}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </ChartCard>
                </div>

                <div className="analytics-grid" style={{ marginTop: "1rem" }}>
                  <ChartCard title="Top Items (Quantity)" subtitle="Best sellers">
                    <HorizontalBarChart
                      data={(analytics.topItems || []).slice(0, 10).map((it) => ({
                        key: String(it.name || ""),
                        label: String(it.name || ""),
                        value: Number(it.qty || 0),
                        metaRight: `Total Revenue: Rs ${Number(it.revenue || 0)}`
                      }))}
                      maxLabelChars={18}
                    />
                  </ChartCard>
                  
                  <ChartCard title="Top Customers (Spending)" subtitle="Valued patrons">
                    <HorizontalBarChart
                      data={(analytics.topCustomers || []).slice(0, 10).map((c) => ({
                        key: `${c.phone || ""}-${c.name || ""}`,
                        label: `${String(c.name || "Customer")} (${String(c.phone || "").slice(-4)})`,
                        value: Number(c.spend || 0),
                        metaRight: `${c.orders} orders placed`,
                        valueSuffix: " Rs"
                      }))}
                      maxLabelChars={18}
                      valueSuffix=" Rs"
                    />
                  </ChartCard>
                </div>
              </>
            )}
          </section>
        ) : null}

        {view === VIEWS.MENU ? (
          <section className="section" id="menu-management">
            <div className="section-head">
              <div>
                <p className="kicker">Inventory</p>
                <h2>Manage Menu</h2>
              </div>
              <button className="btn accent" onClick={loadAdminMenu}>Refresh Menu</button>
            </div>
            <div className="admin-notice">{notice}</div>
            <div className="menu-manage-grid">
              {!menuList.length ? (
                <p>No menu items found.</p>
              ) : (
                menuList.map((item) => (
                  <article 
                    className={`menu-item-card ${item.available === false ? 'unavailable' : ''}`} 
                    key={item.id}
                    onClick={(e) => {
                      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL' && e.target.tagName !== 'BUTTON') {
                        e.currentTarget.querySelector('.edit-name')?.focus();
                      }
                    }}
                  >
                    <div className="item-main">
                      <div className="item-img-wrap">
                        <img src={item.image?.startsWith('http') ? item.image : `${apiBase}${item.image}`} alt={item.name} />
                      </div>
                      <div className="item-details">
                        <input
                          type="text"
                          className="edit-name"
                          defaultValue={item.name}
                          onBlur={(e) => {
                            if (e.target.value !== item.name) {
                              updateMenuItem(item.id, { name: e.target.value });
                            }
                          }}
                        />
                        <div className="item-meta-edit">
                          <div className="price-input-wrap">
                            <span>Rs</span>
                            <input
                              type="number"
                              className="edit-price"
                              defaultValue={item.price}
                              onBlur={(e) => {
                                const newPrice = Number(e.target.value);
                                if (newPrice !== item.price) {
                                  updateMenuItem(item.id, { price: newPrice });
                                }
                              }}
                            />
                          </div>
                          <span className="chip">{item.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="item-actions">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={item.available !== false}
                          onChange={(e) => updateMenuItem(item.id, { available: e.target.checked })}
                          disabled={isSavingMenu[item.id]}
                        />
                        <span className="toggle-text">{item.available !== false ? 'Available' : 'Out of Stock'}</span>
                      </label>
                      {isSavingMenu[item.id] && <span className="saving-indicator">Saving...</span>}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
      </main>

      {activeOrder ? (
        <div className="modal-backdrop" onClick={() => setActiveOrder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="order-detail-head">
              <h3>Order {activeOrder.id}</h3>
              <button className="icon-btn" onClick={() => setActiveOrder(null)}>&times;</button>
            </div>
            <div className="detail-block">
              <p><strong>Status:</strong> {activeOrder.status}</p>
              <p><strong>Payment:</strong> {activeOrder.paymentMode} ({activeOrder.paymentStatus || "Pending"})</p>
              <p><strong>Customer:</strong> {activeOrder.customer?.name} | {activeOrder.customer?.phone}</p>
              <p><strong>Address:</strong> {activeOrder.customer?.address}</p>
              <p><strong>Total:</strong> Rs {activeOrder.pricing?.total}</p>
            </div>

            {activeOrder.status === "Cancellation Requested" ? (
              <div className="detail-block cancellation-request-pane" style={{ background: "#fff5f5", padding: "1.2rem", borderRadius: "16px", border: "1px solid #feb2b2", marginBottom: "1.5rem" }}>
                <h4 style={{ color: "#c53030", margin: "0 0 0.8rem", fontSize: "1.1rem" }}>Cancellation Request Pending</h4>
                <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.95rem" }}>
                  <p><strong>Reason:</strong> {activeOrder.cancelReason}</p>
                  <p><strong>Fee Transaction ID:</strong> <code style={{ background: "#fff", padding: "4px 8px", borderRadius: "6px", border: "1px solid #fed7d7" }}>{activeOrder.paymentRef}</code></p>
                  <p><strong>Fee Amount:</strong> <span style={{ color: "#c53030", fontWeight: 700 }}>Rs {activeOrder.cancellationFee}</span></p>
                </div>
                <div style={{ marginTop: "1.2rem", display: "flex", gap: "0.8rem" }}>
                  <button className="btn accent" style={{ background: "#c53030", border: "none", flex: 1 }} onClick={() => approveCancellation(activeOrder.id, true)}>Approve & Cancel Order</button>
                  <button className="btn subtle" style={{ flex: 1 }} onClick={() => approveCancellation(activeOrder.id, false)}>Reject Request</button>
                </div>
              </div>
            ) : null}
            {String(activeOrder.paymentMode || "").trim().toUpperCase() === "COD" ? (
              <div className="detail-block">
                <strong>COD Payment</strong>
                <div className="admin-order-actions" style={{ marginTop: "0.6rem" }}>
                  {String(activeOrder.paymentStatus || "").toLowerCase() !== "paid" ? (
                    <button className="btn subtle" onClick={() => updateCodPaymentStatus(activeOrder.id, "Paid")}>
                      Mark COD Paid
                    </button>
                  ) : (
                    <button className="btn subtle" onClick={() => updateCodPaymentStatus(activeOrder.id, "Pending")}>
                      Mark Unpaid
                    </button>
                  )}
                </div>
              </div>
            ) : null}
            <div className="detail-block">
              <strong>Status Actions</strong>
              <div className="admin-order-actions" style={{ marginTop: "0.6rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                <button 
                  className={`btn status-btn ${activeOrder.status === "Preparing" ? "active-status-red" : "subtle"}`} 
                  onClick={() => updateOrderStatus(activeOrder.id, "Preparing", "Updated from order details modal")}
                >
                  Preparing
                </button>
                <button 
                  className={`btn status-btn ${activeOrder.status === "Out for Delivery" ? "active-status-red" : "subtle"}`} 
                  onClick={() => updateOrderStatus(activeOrder.id, "Out for Delivery", "Updated from order details modal")}
                >
                  Out for Delivery
                </button>
                <button 
                  className={`btn status-btn ${activeOrder.status === "Delivered" ? "active-status-red" : "subtle"}`} 
                  onClick={() => updateOrderStatus(activeOrder.id, "Delivered", "Updated from order details modal")}
                >
                  Delivered
                </button>
                {activeOrder.paymentStatus === "Verification Pending" || (activeOrder.paymentStatus === "Pending" && activeOrder.paymentMode !== "COD") ? (
                  <button className="btn accent" onClick={() => verifyOrderPayment(activeOrder.id, true)}>Verify & Approve Payment</button>
                ) : null}
                
                <div style={{ marginLeft: "auto" }}>
                  <button 
                    className="btn subtle danger-text" 
                    disabled={activeOrder.status === "Delivered" || activeOrder.status === "Cancelled"} 
                    style={{ border: "1px solid #feb2b2" }}
                    onClick={() => {
                      const fee = calculateCancellationFee(activeOrder);
                      const msg = fee > 0 ? `Order is in ${activeOrder.status} stage. A cancellation fee of Rs ${fee} will be applied. Continue?` : "Are you sure you want to cancel this order?";
                      if (window.confirm(msg)) {
                        updateOrderStatus(activeOrder.id, "Cancelled", `Cancelled by manager (Fee: Rs ${fee})`);
                      }
                    }}
                  >
                    Manual Cancel
                  </button>
                </div>
              </div>
            </div>
            <div className="detail-block">
              <strong>Items (Assign Chef per Item)</strong>
              <ul className="timeline">
                {(activeOrder.items || []).map((item) => (
                  <li key={item.id} className={itemAssignGlow[item.id] ? "item-assign-success" : ""}>
                    <div><strong>{item.name}</strong> x {item.quantity}</div>
                    <div className="admin-order-actions" style={{ marginTop: "0.5rem" }}>
                      <CustomSelect 
                        value={itemChefMap[item.id] || ""} 
                        onChange={(e) => setItemChefMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        options={[
                          { label: "Assign chef", value: "", disabled: activeChefs.length === 0 },
                          ...activeChefs.map(c => ({ 
                            label: `${c.name} (${c.station})${c.isOnDuty ? "" : " - Off Duty"}`, 
                            value: c.id 
                          }))
                        ]}
                      />
                      <button className="btn subtle" disabled={!itemChefMap[item.id]} onClick={() => assignChefToItem(activeOrder.id, item.id)}>Assign Chef</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="detail-block">
              <strong>Payment Attempts</strong>
              <ul className="timeline">
                {(activeOrder.paymentTransactions || []).length ? (
                  activeOrder.paymentTransactions.map((txn) => (
                    <li key={txn.id}>
                      <div><strong>{txn.provider?.toUpperCase() || "N/A"}</strong> - {txn.status}</div>
                      <div>Amount: Rs {txn.amount} {txn.currency}</div>
                      <div>Order Ref: {txn.gatewayOrderId || "-"}</div>
                      <div>Payment Ref: {txn.gatewayPaymentId || "-"}</div>
                      <div>{fmt(txn.createdAt)}{txn.capturedAt ? ` | Captured: ${fmt(txn.capturedAt)}` : ""}</div>
                    </li>
                  ))
                ) : (
                  <li>No payment attempts found.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ title, value, onClick }) {
  return (
    <article className={`kpi-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <p>{title}</p>
      <strong>{value}</strong>
    </article>
  );
}

function fmt(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function isToday(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d.toDateString() === now.toDateString();
  } catch {
    return false;
  }
}

function startOfDay(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

function parseDateInput(value) {
  // value is YYYY-MM-DD from <input type="date">
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function computePastRange(preset, fromInput, toInput) {
  const now = new Date();
  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (preset === "last30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  if (preset === "custom") {
    const fromParsed = parseDateInput(fromInput);
    const toParsed = parseDateInput(toInput);
    if (!fromParsed && !toParsed) return { from: null, to: null };
    let from = fromParsed ? startOfDay(fromParsed) : null;
    let to = toParsed ? endOfDay(toParsed) : null;
    if (from && to && from > to) {
      // User selected dates in reverse order; normalize.
      const tmp = from;
      from = startOfDay(toParsed);
      to = endOfDay(fromParsed);
      // tmp is intentionally unused after swap; kept for clarity.
      void tmp;
    }
    return { from, to };
  }
  // default last7
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  return { from: startOfDay(from), to: endOfDay(now) };
}

function isWithinRange(value, range) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const fromOk = range?.from ? d >= range.from : true;
    const toOk = range?.to ? d <= range.to : true;
    return fromOk && toOk;
  } catch {
    return false;
  }
}

function ChartCard({ title, subtitle, extra, children }) {
  return (
    <article className="chart-card" style={{ position: 'relative' }}>
      <div className="chart-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {subtitle ? <p className="chart-subtitle">{subtitle}</p> : null}
        </div>
        {extra && <div className="chart-extra">{extra}</div>}
      </div>
      <div className="chart-body">{children}</div>
    </article>
  );
}

const CHART_PALETTE = [
  { main: "#ef4444", dark: "#c73232" }, // Red
  { main: "#3b82f6", dark: "#2563eb" }, // Blue
  { main: "#10b981", dark: "#059669" }, // Green
  { main: "#f59e0b", dark: "#d97706" }, // Orange
  { main: "#8b5cf6", dark: "#7c3aed" }, // Purple
  { main: "#ec4899", dark: "#db2777" }, // Pink
  { main: "#06b6d4", dark: "#0891b2" }, // Cyan
  { main: "#6366f1", dark: "#4f46e5" }, // Indigo
];

function BarChart({ data, valueSuffix = "", maxLabelChars = 14 }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...(data || []).map((d) => Number(d.value || 0)));

  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.title}</strong>
          <div>{tip.value}</div>
          {tip.metaRight ? <div className="chart-tip-meta">{tip.metaRight}</div> : null}
        </div>
      )}
      <svg viewBox="0 0 1000 320" preserveAspectRatio="none" className="chart-svg">
        <defs>
          {CHART_PALETTE.map((c, i) => (
            <linearGradient id={`barGrad-${i}`} key={i} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.main} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
          ))}
        </defs>
        {(data || []).map((d, idx) => {
          const v = Math.max(0, Number(d.value || 0));
          const barW = 1000 / Math.max(1, data.length);
          const x = idx * barW;
          const h = (v / max) * 240;
          const y = 40 + (240 - h);
          const label = String(d.label || d.key || "");
          const colorIdx = idx % CHART_PALETTE.length;
          
          const shouldShowLabel = data.length > 10 ? (idx % 2 === 0) : true;
          const showLabel = shouldShowLabel ? (label.length > maxLabelChars ? `${label.slice(0, maxLabelChars - 1)}…` : label) : "";
          
          return (
            <g key={d.key || `${idx}`}>
              <rect
                x={x + barW * 0.15}
                y={y}
                width={barW * 0.7}
                height={h}
                rx="6"
                style={{ fill: `url(#barGrad-${colorIdx})` }}
                className="chart-bar"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  const px = rect ? e.clientX - rect.left : 0;
                  const py = rect ? e.clientY - rect.top : 0;
                  setTip({
                    x: Math.min(820, Math.max(8, px + 12)),
                    y: Math.min(240, Math.max(8, py - 18)),
                    title: label,
                    value: `${v}${valueSuffix}`,
                    metaRight: d.metaRight || ""
                  });
                }}
              />
              {shouldShowLabel && (
                <text x={x + barW / 2} y={306} textAnchor="middle" className="chart-label" style={{ fontSize: '18px' }}>
                  {showLabel}
                </text>
              )}
            </g>
          );
        })}
        <line x1="0" y1="280" x2="1000" y2="280" className="chart-axis" />
      </svg>
    </div>
  );
}

function HorizontalBarChart({ data, valueSuffix = "", maxLabelChars = 20 }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...(data || []).map((d) => Number(d.value || 0)));

  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.title}</strong>
          <div>{tip.value}</div>
          {tip.metaRight ? <div className="chart-tip-meta">{tip.metaRight}</div> : null}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.6rem' }}>
        {(data || []).map((d, idx) => {
          const v = Math.max(0, Number(d.value || 0));
          const w = (v / max) * 100;
          const label = String(d.label || d.key || "");
          const showLabel = label.length > maxLabelChars ? `${label.slice(0, maxLabelChars - 1)}…` : label;
          const color = CHART_PALETTE[idx % CHART_PALETTE.length];
          
          return (
            <div key={d.key || idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div 
                style={{ width: '140px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} 
                title={label}
              >
                {showLabel}
              </div>
              <div style={{ flex: 1, background: '#fff9f4', borderRadius: '999px', height: '16px', position: 'relative', overflow: 'hidden', border: '1px solid var(--line)' }}>
                <div 
                  style={{ 
                    width: `${w}%`, 
                    height: '100%', 
                    background: `linear-gradient(90deg, ${color.main}, ${color.dark})`, 
                    borderRadius: '999px', 
                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
                  }} 
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    setTip({ 
                      x: e.clientX - rect.left + 140, 
                      y: e.clientY - rect.top - 40, 
                      title: label, 
                      value: `${v}${valueSuffix}`,
                      metaRight: d.metaRight || ""
                    });
                  }}
                />
              </div>
              <div style={{ width: '70px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)' }}>
                {v}{valueSuffix}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function LineChart({ data, valueSuffix = "", color = "#3b82f6" }) {
  const [tip, setTip] = useState(null);
  const vals = (data || []).map(d => Number(d.value || 0));
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const range = max - min;
  
  const width = 1000;
  const height = 280;
  const padding = 40;
  
  const points = (data || []).map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((d.value - min) / range) * (height - padding * 2) - padding;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.length > 0 ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ") : "";
  const areaD = points.length > 0 ? `${pathD} L ${points[points.length-1].x} ${height} L ${points[0].x} ${height} Z` : "";

  return (
    <div className="chart-wrap" onMouseLeave={() => setTip(null)}>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.title}</strong>
          <div>{tip.value}</div>
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGradient)" className="chart-area" />
        <path d={pathD} className="chart-line" style={{ stroke: color, fill: 'none', strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' }} />
        {points.map((p, i) => {
          // Show label if it's the first, last, or one of the middle points (skip some for readability)
          const shouldShowLabel = points.length > 10 ? (i % Math.ceil(points.length / 8) === 0) : true;
          return (
            <g key={i}>
              <circle 
                cx={p.x} 
                cy={p.y} 
                r="6" 
                className="chart-dot" 
                style={{ stroke: color, fill: '#fff', strokeWidth: 3 }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  const px = rect ? e.clientX - rect.left : 0;
                  const py = rect ? e.clientY - rect.top : 0;
                  setTip({ x: px, y: py - 40, title: p.label, value: `${p.value}${valueSuffix}` });
                }}
              />
              {shouldShowLabel && (
                <text x={p.x} y={height - 5} textAnchor="middle" className="chart-label" style={{ fontSize: '14px' }}>
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ data, centerTitle, centerLabel }) {
  const [tip, setTip] = useState(null);
  const total = (data || []).reduce((sum, d) => sum + Number(d.value || 0), 0);
  let currentAngle = -90;
  const radius = 120;
  const strokeWidth = 20;
  const center = 160;

  return (
    <div className="chart-wrap" style={{ display: 'flex', justifyContent: 'center' }} onMouseLeave={() => setTip(null)}>
      {tip && (
        <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.title}</strong>
          <div>{tip.value} ({tip.percent}%)</div>
        </div>
      )}
      <svg viewBox="0 0 320 320" style={{ width: '260px', height: '260px' }}>
        {(data || []).map((d, i) => {
          const percent = (d.value / total) * 100;
          const angle = (d.value / total) * 360;
          const dashArray = (percent * 2 * Math.PI * radius) / 100;
          const dashOffset = (currentAngle * 2 * Math.PI * radius) / 360;
          const color = `hsl(${(i * 137.5) % 360}, 70%, 55%)`;
          
          const segment = (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashArray} 1000`}
              strokeDashoffset={-dashOffset}
              className="donut-segment"
              onMouseMove={(e) => {
                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                setTip({ 
                  x: e.clientX - rect.left, 
                  y: e.clientY - rect.top - 40, 
                  title: d.label, 
                  value: d.value,
                  percent: percent.toFixed(1)
                });
              }}
            />
          );
          currentAngle += angle;
          return segment;
        })}
        <text x={center} y={center - 10} textAnchor="middle" className="donut-center-text">{centerTitle}</text>
        <text x={center} y={center + 20} textAnchor="middle" className="donut-center-label">{centerLabel}</text>
      </svg>
    </div>
  );
}
