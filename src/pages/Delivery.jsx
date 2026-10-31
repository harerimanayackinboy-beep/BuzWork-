import { Component, useEffect, useMemo, useState } from "react";

// Order & Delivery for BuzWork: category -> store -> items -> checkout -> my orders,
// plus an incoming-orders screen for store staff (restaurants, groceries, bakery...).
// Props: supabase (your existing client), user (logged-in user, needs user.id), onBack().

const RED = "#b91c1c";
const LABEL = {
  placed: "Placed", accepted: "Accepted", preparing: "Preparing", ready: "Ready",
  out_for_delivery: "On the way", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected",
};
const DELIVERY_LABEL = {
  searching: "Finding a driver", driver_assigned: "Driver assigned", driver_arriving: "Driver arriving",
  picked_up: "Picked up", in_transit: "On the way", delivered: "Delivered", cancelled: "Cancelled", disputed: "Disputed",
};
const money = (n, c = "ZAR") => `${c === "ZAR" ? "R" : c + " "}${Number(n || 0).toFixed(2)}`;

const stepsFor = (o, ds) => {
  const del = o.fulfillment === "delivery";
  const steps = del ? ["Placed", "Accepted", "Preparing", "Ready", "Picked up", "Delivered"] : ["Placed", "Accepted", "Preparing", "Ready", "Collected"];
  let i = { placed: 0, accepted: 1, preparing: 2, ready: 3, out_for_delivery: 4, completed: steps.length - 1 }[o.status] ?? 0;
  if (del && (ds === "picked_up" || ds === "in_transit")) i = 4;
  if (del && ds === "delivered") i = 5;
  return { steps, i };
};

const statusMessage = (o, ds) => {
  if (o.status === "cancelled") return "This order was cancelled.";
  if (o.status === "rejected") return "The store could not accept this order.";
  if (o.fulfillment !== "delivery") {
    return {
      placed: "Waiting for the store to accept your order.",
      accepted: "The store accepted your order and will start preparing it.",
      preparing: "The store is preparing your order.",
      ready: "Your order is ready. You can pick it up now.",
      completed: "Order completed. Enjoy!",
    }[o.status] || "";
  }
  if (ds === "delivered" || o.status === "completed") return "✅ Delivered. Enjoy!";
  if (ds === "picked_up" || ds === "in_transit") return "✅ The driver has picked up your order and is on the way to you.";
  if (ds === "driver_assigned" || ds === "driver_arriving") {
    return o.status === "ready"
      ? "The driver is at the store to collect your order."
      : "Your driver is heading to the store. The store has not handed over the order yet.";
  }
  if (ds === "searching") return "Finding a driver for your order...";
  return {
    placed: "Waiting for the store to accept your order.",
    accepted: "The store accepted your order and will start preparing it.",
    preparing: "The store is preparing your order.",
    ready: "Your order is ready. Waiting for a driver.",
  }[o.status] || "";
};

const ago = (iso) => {
  if (!iso) return "";
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return sec < 60 ? `${sec}s ago` : `${Math.round(sec / 60)} min ago`;
};

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

function DeliveryInner({ supabase, user, onBack }) {
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
  const [pins, setPins] = useState({});
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [track, setTrack] = useState(null);

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
    const ids = (data || []).filter((o) => o.buzrider_delivery_id).map((o) => o.id);
    if (ids.length) {
      const { data: p } = await supabase.from("order_delivery_pins").select("order_id, pin").in("order_id", ids);
      setPins(Object.fromEntries((p || []).map((x) => [x.order_id, x.pin])));
    }
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
    const ch = supabase.channel(`store-orders-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "store_orders" }, () => {
        loadOrders();
        loadIncoming();
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [staffOf]);

  useEffect(() => {
    if (view !== "orders") return;
    const sync = () => orders
      .filter((o) => o.buzrider_delivery_id && !["completed", "cancelled", "rejected"].includes(o.status))
      .forEach((o) => supabase.functions.invoke("buzrider-delivery", { body: { action: "sync", order_id: o.id } }).then(loadOrders));
    sync();
    const t = setInterval(sync, 15000);
    return () => clearInterval(t);
  }, [view, orders.length]);

  useEffect(() => {
    if (view !== "detail" || !detailId) return;
    let off = false;
    const pull = () => supabase.functions.invoke("buzrider-delivery", { body: { action: "track", order_id: detailId } })
      .then(({ data }) => { if (!off && data && !data.error) { setTrack(data); loadOrders(); } });
    pull();
    const t = setInterval(pull, 10000);
    return () => { off = true; clearInterval(t); };
  }, [view, detailId]);

  const openDetail = (o) => { setTrack(null); setDetailId(o.id); setView("detail"); };

  const openStore = async (r) => {
    setStore(r); setCart({}); setError(""); setEditId(null);
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
    const args = {
      p_items: lines.map((l) => ({ menu_item_id: l.id, quantity: l.qty })),
      p_fulfillment: fulfillment,
      p_payment: payment,
      p_address: fulfillment === "delivery" ? address.trim() : null,
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_notes: notes.trim() || null,
    };
    const { error: e } = editId
      ? await supabase.rpc("update_store_order", { p_order: editId, ...args })
      : await supabase.rpc("place_store_order", { p_store: store.id, ...args });
    setBusy(false);
    if (e) { setError(e.message); return; }
    setCart({});
    setEditId(null);
    await loadOrders();
    setView("orders");
  };

  const cancelOrder = async (o) => {
    if (!window.confirm("Cancel this order?")) return;
    const { data, error: e } = await supabase.rpc("cancel_store_order", { p_order: o.id });
    if (e || !data) alert(e?.message || "This order can no longer be cancelled.");
    loadOrders();
  };

  const startEdit = async (o) => {
    const r = stores.find((x) => x.id === o.store_id);
    if (!r) return;
    const { data } = await supabase.from("store_items").select("*")
      .eq("store_id", r.id).eq("is_available", true).order("category").order("name");
    setStore(r);
    setMenu(data || []);
    setCart(Object.fromEntries((o.store_order_items || []).filter((i) => i.menu_item_id).map((i) => [i.menu_item_id, i.quantity])));
    setFulfillment(o.fulfillment);
    setPayment(o.payment_method);
    setAddress(o.delivery_address || "");
    setCoords(o.delivery_lat != null ? { lat: o.delivery_lat, lng: o.delivery_lng } : null);
    setNotes(o.notes || "");
    setError("");
    setEditId(o.id);
    setView("menu");
  };

  const setStatus = async (o, status) => {
    setError("");
    const { error: e } = await supabase.from("store_orders").update({ status }).eq("id", o.id);
    if (e) { setError(e.message); return; }
    if (status === "preparing" && o.fulfillment === "delivery") {
      const { data, error: fe } = await supabase.functions.invoke("buzrider-delivery", { body: { action: "request", order_id: o.id } });
      if (fe || data?.error) setError("Could not request a driver: " + (data?.error || fe.message));
    }
    loadIncoming();
  };

  const Header = ({ title, back }) => (
    <div style={{ marginBottom: 12 }}>
      <button style={s.ghost} onClick={back}>← Back</button>
      <h2 style={{ margin: "4px 0 0" }}>{title}</h2>
    </div>
  );

  const OrderCard = ({ o, staff }) => (
    <div style={{ ...s.card, cursor: staff ? "default" : "pointer" }} onClick={staff ? undefined : () => openDetail(o)}>
      <div style={s.row}>
        <strong>{staff ? new Date(o.created_at).toLocaleTimeString() : o.stores?.name}</strong>
        <span style={s.badge(o.status === "rejected" || o.status === "cancelled" ? "#6b7280" : RED)}>{LABEL[o.status]}{staff ? "" : " ›"}</span>
      </div>
      <div style={{ fontSize: 14, color: "#4b5563", margin: "6px 0" }}>
        {(o.store_order_items || []).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
      </div>
      <div style={{ fontSize: 14 }}>
        {o.fulfillment === "delivery" ? "Delivery" : "Pickup"} · {o.payment_method === "cash" ? "Cash" : "Online"} · <strong>{money(o.total, o.currency)}</strong>
      </div>
      {o.fulfillment === "delivery" && o.delivery_status && (
        <div style={{ fontSize: 14, marginTop: 6 }}>🛵 {DELIVERY_LABEL[o.delivery_status] || o.delivery_status}{Number(o.delivery_fee) > 0 ? ` · delivery ${money(o.delivery_fee, o.currency)}` : ""}</div>
      )}
      {!staff && pins[o.id] && !["completed", "cancelled", "rejected"].includes(o.status) && (
        <div style={{ marginTop: 6, padding: 8, background: "#fef3c7", borderRadius: 8, fontSize: 14 }}>
          🔐 Give this PIN to the driver when you receive your order: <strong style={{ fontSize: 18 }}>{pins[o.id]}</strong>
        </div>
      )}
      {staff && o.fulfillment === "delivery" && <div style={{ fontSize: 13, marginTop: 4 }}>📍 {o.delivery_address}</div>}
      {staff && o.notes && <div style={{ fontSize: 13, marginTop: 4 }}>📝 {o.notes}</div>}
      {!staff && ["placed", "accepted"].includes(o.status) && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {o.status === "placed" && <button style={s.small} onClick={(e) => { e.stopPropagation(); startEdit(o); }}>Edit order</button>}
          <button style={{ ...s.small, background: "#6b7280" }} onClick={(e) => { e.stopPropagation(); cancelOrder(o); }}>Cancel order</button>
        </div>
      )}
      {staff && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {o.status === "placed" && <>
            <button style={s.small} onClick={() => setStatus(o, "accepted")}>Accept</button>
            <button style={{ ...s.small, background: "#6b7280" }} onClick={() => setStatus(o, "rejected")}>Reject</button>
          </>}
          {o.status === "accepted" && <button style={s.small} onClick={() => setStatus(o, "preparing")}>Start preparing</button>}
          {o.status === "preparing" && <button style={s.small} onClick={() => setStatus(o, "ready")}>Mark ready</button>}
        </div>
      )}
    </div>
  );

  if (view === "detail") {
    const o = orders.find((x) => x.id === detailId);
    if (!o) return (<div style={s.page}><Header title="Order" back={() => setView("orders")} /><p>Loading...</p></div>);
    const ds = track?.delivery_status ?? o.delivery_status;
    const { steps, i } = stepsFor(o, ds);
    const d = track?.driver;
    const loc = track?.location;
    const st = track?.store;
    const delivering = o.fulfillment === "delivery";
    const bad = ["cancelled", "rejected"].includes(o.status);
    const bbox = loc ? [loc.lng - 0.01, loc.lat - 0.006, loc.lng + 0.01, loc.lat + 0.006].join("%2C") : "";
    return (
      <div style={s.page}>
        <Header title={o.stores?.name || "Order"} back={() => setView("orders")} />
        <div style={{ ...s.card, background: bad ? "#f3f4f6" : "#fef3c7" }}>{statusMessage(o, ds)}</div>

        {!bad && (
          <div style={s.card}>
            {steps.map((label, n) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", opacity: n <= i ? 1 : 0.4 }}>
                <span style={{ width: 22, height: 22, borderRadius: 11, background: n <= i ? RED : "#d1d5db", color: "#fff", fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{n <= i ? "✓" : n + 1}</span>
                <span style={{ fontWeight: n === i ? 700 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {delivering && d && (
          <div style={s.card}>
            <strong>Your driver</strong>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
              {d.photo_url && /^https?:/.test(d.photo_url)
                ? <img src={d.photo_url} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: "cover" }} />
                : <div style={{ width: 56, height: 56, borderRadius: 28, background: RED, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{(d.name || "?").slice(0, 1).toUpperCase()}</div>}
              <div style={{ flex: 1 }}>
                <div><strong>{d.name || "Driver"}</strong></div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>
                  {d.rating > 0 ? `⭐ ${d.rating.toFixed(1)} (${d.rating_count})` : "New driver"}
                </div>
                <div style={{ fontSize: 14, color: "#4b5563" }}>
                  🏍️ {d.vehicle_type}{d.registration_number ? ` · ${d.registration_number}` : ""}
                </div>
              </div>
            </div>
            {d.phone && <a href={`tel:${d.phone}`} style={{ ...s.small, display: "inline-block", marginTop: 10, textDecoration: "none" }}>📞 Call driver</a>}
          </div>
        )}

        {delivering && ds && !d && ds === "searching" && <div style={s.card}>🔎 Looking for a driver near the store...</div>}

        {delivering && d && ["driver_assigned", "driver_arriving", "picked_up", "in_transit"].includes(ds) && (
          <div style={s.card}>
            <strong>Driver location</strong>
            {loc ? (
              <>
                <iframe
                  title="map" loading="lazy"
                  style={{ width: "100%", height: 220, border: 0, borderRadius: 10, marginTop: 8 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`}
                />
                <div style={{ ...s.row, marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                  <span>Updated {ago(loc.updated_at)}</span>
                  <a style={{ color: RED }} href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer">Open in Maps</a>
                </div>
              </>
            ) : <div style={{ marginTop: 6, color: "#6b7280" }}>Location not available yet.</div>}
          </div>
        )}

        {pins[o.id] && !["completed", "cancelled", "rejected"].includes(o.status) && (
          <div style={{ ...s.card, background: "#fef3c7" }}>
            🔐 Give this PIN to the driver when you receive your order: <strong style={{ fontSize: 20 }}>{pins[o.id]}</strong>
          </div>
        )}

        <div style={s.card}>
          {(o.store_order_items || []).map((it) => (
            <div key={it.id} style={s.row}><span>{it.quantity}× {it.name}</span><span>{money(it.unit_price * it.quantity, o.currency)}</span></div>
          ))}
          {Number(o.delivery_fee) > 0 && <div style={s.row}><span>Delivery</span><span>{money(o.delivery_fee, o.currency)}</span></div>}
          <hr />
          <div style={s.row}><strong>Total</strong><strong>{money(o.total, o.currency)}</strong></div>
          {delivering && o.delivery_address && <div style={{ fontSize: 13, marginTop: 6 }}>📍 {o.delivery_address}</div>}
        </div>
      </div>
    );
  }

  if (view === "orders") return (
    <div style={s.page}>
      <Header title="My orders" back={() => setView("stores")} />
      {error && <p style={{ color: RED }}>{error}</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map((o) => <OrderCard key={o.id} o={o} />)}
    </div>
  );

  if (view === "incoming") return (
    <div style={s.page}>
      <Header title="Store orders" back={() => setView("stores")} />
      {error && <p style={{ color: RED }}>{error}</p>}
      {incoming.length === 0 && <p>No active orders.</p>}
      {incoming.map((o) => <OrderCard key={o.id} o={o} staff />)}
    </div>
  );

  if (view === "menu") {
    const groups = menu.reduce((a, m) => { (a[m.category || "Menu"] ||= []).push(m); return a; }, {});
    return (
      <div style={s.page}>
        <Header title={editId ? `Edit order · ${store.name}` : store.name} back={() => { if (editId) { setEditId(null); setCart({}); setView("orders"); } else setView("stores"); }} />
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
      <Header title={editId ? "Update order" : "Confirm order"} back={() => setView("menu")} />
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
          {busy ? "Sending..." : `${editId ? "Save changes" : "Confirm order"} · ${money(total)}`}
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

class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={s.page}>
          <button style={s.ghost} onClick={this.props.onBack}>← Back</button>
          <h3>Something went wrong</h3>
          <p style={{ color: RED, wordBreak: "break-word" }}>{String(this.state.err?.message || this.state.err)}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Delivery(props) {
  return <Boundary onBack={props.onBack}><DeliveryInner {...props} /></Boundary>;
}
