import { useEffect, useMemo, useState } from "react";

// Order & Delivery for BuzWork: category -> store -> items -> checkout -> my orders,
// plus an incoming-orders screen for store staff (restaurants, groceries, bakery...).
// Props: supabase (your existing client), user (logged-in user, needs user.id), onBack().

const RED = "#b91c1c";
const LABEL = {
  placed: "Placed", accepted: "Accepted", preparing: "Preparing", ready: "Ready",
  out_for_delivery: "On the way", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected",
};
const money = (n, c = "ZAR") => `${c === "ZAR" ? "R" : c + " "}${Number(n || 0).toFixed(2)}`;

const s = {
  page: { padding: 16, maxWidth: 560, margin: "0 auto", paddingBottom: 110 },
  card: { background: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,.12)" },
  btn: { background: RED, color: "#fff", border: 0, borderRadius: 12, padding: "13px 16px", fontSize: 16, width: "100%" },
  small: { background: RED, color: "#fff", border: 0, borderRadius: 10, padding: "8px 12px", fontSize: 14 },
  ghost: { background: "transparent", border: 0, color: RED, fontSize: 16, padding: "4px 0" },
  input: { width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16, boxSizing: "border-box" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  chip: (on) => ({ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${on ? RED : "#d1d5db"}`, background: on ? "#fee2e2" : "#fff", fontSize: 15 }),
  qty: { width: 34, height: 34, borderRadius: 17, border: `1px solid ${RED}`, background: "#fff", color: RED, fontSize: 18 },
  bar: { position: "fixed", left: 0, right: 0, bottom: 0, padding: 12, background: "#fff", boxShadow: "0 -2px 8px rgba(0,0,0,.12)" },
  badge: (c) => ({ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: c, color: "#fff" }),
};

export default function Delivery({ supabase, user, onBack }) {
  const [view, setView] = useState("stores");
  const [stores, setStores] = useState([]);
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState(null);
  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [fulfillment, setFulfillment] = useState("pickup");
  const [payment, setPayment] = useState("cash");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState(null);
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState([]);
  const [staffOf, setStaffOf] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("store_categories").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => setCategories(data || []));
    supabase.from("stores").select("*").eq("is_active", true).order("name")
      .then(({ data }) => setStores(data || []));
    supabase.from("store_staff").select("store_id").eq("user_id", user.id)
      .then(({ data }) => setStaffOf((data || []).map((r) => r.store_id)));
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase.from("store_orders")
      .select("*, stores(name), store_order_items(*)")
      .eq("customer_id", user.id).order("created_at", { ascending: false });
    setOrders(data || []);
  };
  const loadIncoming = async () => {
    if (!staffOf.length) return;
    const { data } = await supabase.from("store_orders")
      .select("*, stores(name), store_order_items(*)")
      .in("store_id", staffOf).in("status", ["placed", "accepted", "preparing", "ready"])
      .order("created_at");
    setIncoming(data || []);
  };

  useEffect(() => {
    loadOrders();
    loadIncoming();
    const ch = supabase.channel("store-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_orders" }, () => {
        loadOrders();
        loadIncoming();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [staffOf]);

  const openStore = async (r) => {
    setStore(r); setCart({}); setError("");
    const { data } = await supabase.from("store_items").select("*")
      .eq("store_id", r.id).eq("is_available", true).order("category").order("name");
    setMenu(data || []);
    setView("menu");
  };

  const change = (id, d) => setCart((c) => {
    const n = Math.max(0, (c[id] || 0) + d);
    const x = { ...c };
    if (n) x[id] = n; else delete x[id];
    return x;
  });

  const lines = useMemo(() => menu.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] })), [menu, cart]);
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const count = lines.reduce((a, l) => a + l.qty, 0);

  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => setError("Could not get your location. Please allow location access."),
    { enableHighAccuracy: true },
  );

  const place = async () => {
    setError("");
    if (fulfillment === "delivery" && (!coords || !address.trim())) {
      setError("For delivery, enter your address and share your location.");
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.rpc("place_store_order", {
      p_store: store.id,
      p_items: lines.map((l) => ({ menu_item_id: l.id, quantity: l.qty })),
      p_fulfillment: fulfillment,
      p_payment: payment,
      p_address: fulfillment === "delivery" ? address.trim() : null,
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_notes: notes.trim() || null,
    });
    setBusy(false);
    if (e) { setError(e.message); return; }
    setCart({});
    await loadOrders();
    setView("orders");
  };

  const setStatus = async (id, status) => {
    await supabase.from("store_orders").update({ status }).eq("id", id);
    loadIncoming();
  };

  const Header = ({ title, back }) => (
    <div style={{ marginBottom: 12 }}>
      <button style={s.ghost} onClick={back}>← Back</button>
      <h2 style={{ margin: "4px 0 0" }}>{title}</h2>
    </div>
  );

  const OrderCard = ({ o, staff }) => (
    <div style={s.card}>
      <div style={s.row}>
        <strong>{staff ? new Date(o.created_at).toLocaleTimeString() : o.stores?.name}</strong>
        <span style={s.badge(o.status === "rejected" || o.status === "cancelled" ? "#6b7280" : RED)}>{LABEL[o.status]}</span>
      </div>
      <div style={{ fontSize: 14, color: "#4b5563", margin: "6px 0" }}>
        {(o.store_order_items || []).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
      </div>
      <div style={{ fontSize: 14 }}>
        {o.fulfillment === "delivery" ? "Delivery" : "Pickup"} · {o.payment_method === "cash" ? "Cash" : "Online"} · <strong>{money(o.total, o.currency)}</strong>
      </div>
      {staff && o.fulfillment === "delivery" && <div style={{ fontSize: 13, marginTop: 4 }}>📍 {o.delivery_address}</div>}
      {staff && o.notes && <div style={{ fontSize: 13, marginTop: 4 }}>📝 {o.notes}</div>}
      {staff && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {o.status === "placed" && <>
            <button style={s.small} onClick={() => setStatus(o.id, "accepted")}>Accept</button>
            <button style={{ ...s.small, background: "#6b7280" }} onClick={() => setStatus(o.id, "rejected")}>Reject</button>
          </>}
          {o.status === "accepted" && <button style={s.small} onClick={() => setStatus(o.id, "preparing")}>Start preparing</button>}
          {o.status === "preparing" && <button style={s.small} onClick={() => setStatus(o.id, "ready")}>Mark ready</button>}
        </div>
      )}
    </div>
  );

  if (view === "orders") return (
    <div style={s.page}>
      <Header title="My orders" back={() => setView("stores")} />
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map((o) => <OrderCard key={o.id} o={o} />)}
    </div>
  );

  if (view === "incoming") return (
    <div style={s.page}>
      <Header title="Store orders" back={() => setView("stores")} />
      {incoming.length === 0 && <p>No active orders.</p>}
      {incoming.map((o) => <OrderCard key={o.id} o={o} staff />)}
    </div>
  );

  if (view === "menu") {
    const groups = menu.reduce((a, m) => { (a[m.category || "Menu"] ||= []).push(m); return a; }, {});
    return (
      <div style={s.page}>
        <Header title={store.name} back={() => setView("stores")} />
        {Object.entries(groups).map(([cat, items]) => (
          <div key={cat}>
            <h4 style={{ margin: "12px 0 6px" }}>{cat}</h4>
            {items.map((m) => (
              <div key={m.id} style={{ ...s.card, ...s.row }}>
                <div>
                  <div><strong>{m.name}</strong>{m.unit ? <span style={{ color: "#6b7280", fontSize: 13 }}> · {m.unit}</span> : null}</div>
                  {m.description && <div style={{ fontSize: 13, color: "#6b7280" }}>{m.description}</div>}
                  <div style={{ marginTop: 4 }}>{money(m.price, m.currency)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {cart[m.id] ? <>
                    <button style={s.qty} onClick={() => change(m.id, -1)}>−</button>
                    <span>{cart[m.id]}</span>
                  </> : null}
                  <button style={s.qty} onClick={() => change(m.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        ))}
        {menu.length === 0 && <p>This store has no items yet.</p>}
        {count > 0 && (
          <div style={s.bar}>
            <button style={s.btn} onClick={() => setView("checkout")}>
              View order · {count} item{count > 1 ? "s" : ""} · {money(total)}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === "checkout") return (
    <div style={s.page}>
      <Header title="Confirm order" back={() => setView("menu")} />
      <div style={s.card}>
        {lines.map((l) => (
          <div key={l.id} style={s.row}><span>{l.qty}× {l.name}</span><span>{money(l.price * l.qty, l.currency)}</span></div>
        ))}
        <hr />
        <div style={s.row}><strong>Items total</strong><strong>{money(total)}</strong></div>
      </div>
      <p style={{ margin: "12px 0 6px" }}><strong>How do you want it?</strong></p>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={s.chip(fulfillment === "pickup")} onClick={() => setFulfillment("pickup")}>🚶 I will pick up</button>
        <button style={s.chip(fulfillment === "delivery")} onClick={() => setFulfillment("delivery")}>🛵 Deliver to me</button>
      </div>
      {fulfillment === "delivery" && (
        <div style={{ marginTop: 10 }}>
          <input style={s.input} placeholder="Delivery address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button style={{ ...s.ghost, marginTop: 8 }} onClick={locate}>
            {coords ? "📍 Location shared ✓" : "📍 Share my location"}
          </button>
          <p style={{ fontSize: 13, color: "#6b7280" }}>The delivery fee is confirmed by the delivery service after your order is accepted.</p>
        </div>
      )}
      <p style={{ margin: "12px 0 6px" }}><strong>Payment</strong></p>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={s.chip(payment === "cash")} onClick={() => setPayment("cash")}>💵 Cash</button>
        <button style={s.chip(payment === "online")} onClick={() => setPayment("online")}>💳 Online</button>
      </div>
      <textarea style={{ ...s.input, marginTop: 12 }} rows={2} placeholder="Notes for the store (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p style={{ color: RED }}>{error}</p>}
      <div style={s.bar}>
        <button style={{ ...s.btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={place}>
          {busy ? "Sending..." : `Confirm order · ${money(total)}`}
        </button>
      </div>
    </div>
  );

  const shown = stores.filter((r) => (!cat || r.category_id === cat) && r.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div style={s.page}>
      <div style={s.row}>
        <button style={s.ghost} onClick={onBack}>← Back</button>
        <div style={{ display: "flex", gap: 14 }}>
          {staffOf.length > 0 && <button style={s.ghost} onClick={() => setView("incoming")}>🍳 Store orders ({incoming.filter((o) => o.status === "placed").length})</button>}
          <button style={s.ghost} onClick={() => setView("orders")}>📋 My orders</button>
        </div>
      </div>
      <h2 style={{ margin: "8px 0" }}>🛍️ Order &amp; Delivery</h2>
      <input style={s.input} placeholder="Search stores..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "10px 0 2px", paddingBottom: 4 }}>
        <button style={{ ...s.chip(!cat), flex: "none", whiteSpace: "nowrap" }} onClick={() => setCat(null)}>All</button>
        {categories.map((c) => (
          <button key={c.id} style={{ ...s.chip(cat === c.id), flex: "none", whiteSpace: "nowrap" }} onClick={() => setCat(c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        {shown.map((r) => (
          <div key={r.id} style={{ ...s.card, opacity: r.is_open ? 1 : 0.55 }} onClick={() => r.is_open && openStore(r)}>
            <div style={s.row}>
              <strong>{r.name}</strong>
              <span style={s.badge(r.is_open ? "#15803d" : "#6b7280")}>{r.is_open ? "Open" : "Closed"}</span>
            </div>
            {r.description && <div style={{ fontSize: 14, color: "#4b5563" }}>{r.description}</div>}
            {r.address && <div style={{ fontSize: 13, color: "#6b7280" }}>📍 {r.address}</div>}
          </div>
        ))}
        {shown.length === 0 && <p>No stores found.</p>}
      </div>
    </div>
  );
}
