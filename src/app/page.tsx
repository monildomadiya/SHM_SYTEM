"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Package, ReceiptText, Coffee, Menu, ArrowRight, Users, Clock, AlertTriangle, TrendingUp, CheckCircle2, ShoppingCart } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const menuItems = [
  { name: "Stock Summary", sub: "Inventory & Ledger", path: "/stock", shortcut: "S", icon: Package, color: "#4f46e5", bg: "#ede9fe" },
  { name: "Supplier Orders", sub: "Purchase Orders", path: "/orders", shortcut: "O", icon: ReceiptText, color: "#0891b2", bg: "#e0f2fe" },
  { name: "Suppliers", sub: "Party Master", path: "/suppliers", shortcut: "M", icon: Users, color: "#16a34a", bg: "#dcfce7" },
  { name: "Tea Tracker", sub: "Office Log", path: "/tea-tracker", shortcut: "T", icon: Coffee, color: "#d97706", bg: "#fef3c7" },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliersCount, setSuppliersCount] = useState(0);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  useEffect(() => {
    const unsubOrders = onValue(ref(db, 'companyOrders'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]: any) => ({ id: key, ...val }));
        setOrders(arr);
      } else setOrders([]);
    });
    const unsubSuppliers = onValue(ref(db, 'suppliers'), (snapshot) => {
      const data = snapshot.val();
      setSuppliersCount(data ? Object.keys(data).length : 0);
    });
    return () => { unsubOrders(); unsubSuppliers(); };
  }, []);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'Pending'), [orders]);
  const deliveredOrders = useMemo(() => orders.filter(o => o.status === 'Delivered'), [orders]);
  const urgentOrders = useMemo(() => pendingOrders.filter(o => o.urgency === 'Urgent'), [pendingOrders]);

  const supplierChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { if (o.companyName) counts[o.companyName] = (counts[o.companyName] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  const oldestPending = useMemo(() => {
    return [...pendingOrders].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).slice(0, 4);
  }, [pendingOrders]);

  const COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f59e0b', '#ec4899'];

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <button className="mobile-menu-btn" style={{ display: "block", padding: 0, border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="top-bar-left"><div className="breadcrumb"><span className="breadcrumb-current">Dashboard</span></div></div>
          <div style={{ flex: 1 }} />
          <div className="top-bar-right">
            <div className="top-bar-date">{new Date().toLocaleDateString("en-GB")}</div>
            <div className="user-profile"><div className="avatar">A</div></div>
          </div>
        </div>

        {/* Hero Strip */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", padding: "28px 32px 36px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--brand-400)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "6px" }}>Enterprise Overview</p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1.2, marginBottom: "4px" }}>Welcome back 👋</h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", fontWeight: 500 }}>{today}</p>
        </div>

        <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Urgency Banner */}
          {urgentOrders.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.9rem' }}>
                {urgentOrders.length} URGENT order{urgentOrders.length > 1 ? 's' : ''} need{urgentOrders.length === 1 ? 's' : ''} immediate attention!
              </span>
              <Link href="/orders" style={{ marginLeft: 'auto', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', textDecoration: 'underline' }}>View Orders →</Link>
            </div>
          )}

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #f59e0b' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShoppingCart size={20} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#0f172a' }}>{pendingOrders.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>Pending Orders</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #10b981' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#0f172a' }}>{deliveredOrders.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>Delivered</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #6366f1' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ede9fe', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#0f172a' }}>{suppliersCount}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>Suppliers</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#0f172a' }}>{urgentOrders.length}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>Urgent</div>
              </div>
            </div>
          </div>

          {/* Charts + Action Items */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>Top Suppliers by Orders</h2>
                <TrendingUp size={16} style={{ color: '#94a3b8' }} />
              </div>
              {supplierChartData.length === 0 ? (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No order data yet</div>
              ) : (
                <div style={{ height: '200px', marginLeft: '-8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.85rem' }} />
                      <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40}>
                        {supplierChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>Pending Action Required</h2>
                <Link href="/orders"><span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>View All →</span></Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {oldestPending.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={28} style={{ color: '#10b981', marginBottom: '8px' }} /><br />All caught up! No pending orders.
                  </div>
                ) : oldestPending.map(order => {
                  const urgencyColor = order.urgency === 'Urgent' ? '#ef4444' : order.urgency === 'High' ? '#f59e0b' : '#94a3b8';
                  return (
                    <div key={order.id} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${urgencyColor}` }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginBottom: '2px' }}>{order.companyName}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                          <Clock size={11} /> {new Date(order.timestamp).toLocaleDateString('en-GB')} · {order.items?.length || 0} items
                        </div>
                      </div>
                      <span style={{ background: urgencyColor + '15', color: urgencyColor, padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        {order.urgency || 'Normal'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Module Cards */}
          <div className="page-section">
            <div className="page-section-title">Quick Navigation</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <div className="module-card" style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: item.bg, color: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <IconComponent size={18} />
                        </div>
                        <span style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 800, fontSize: '0.68rem', padding: '2px 7px', borderRadius: '4px', fontFamily: 'monospace', border: '1px solid #e2e8f0' }}>{item.shortcut}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '2px' }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: item.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.sub}</div>
                      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                        Open <ArrowRight size={13} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#cbd5e1", fontWeight: 500 }}>
            SHM-SYSTEM v2.0 · Professional Enterprise ERP
          </p>
        </div>
      </main>
    </div>
  );
}
