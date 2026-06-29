"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Package, ReceiptText, Coffee, Menu, ArrowRight, Users, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const menuItems = [
  {
    name: "Stock Summary",
    sub: "Inventory & Ledger",
    path: "/stock",
    shortcut: "S",
    icon: Package,
    color: "#4f46e5",
  },
  {
    name: "Supplier Orders",
    sub: "Purchase Orders",
    path: "/orders",
    shortcut: "V",
    icon: ReceiptText,
    color: "#0891b2",
  },
  {
    name: "Suppliers",
    sub: "Party Master",
    path: "/suppliers",
    shortcut: "M",
    icon: Users,
    color: "#16a34a",
  },
  {
    name: "Tea Tracker",
    sub: "Office Log",
    path: "/tea-tracker",
    shortcut: "T",
    icon: Coffee,
    color: "#d97706",
  },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliersCount, setSuppliersCount] = useState(0);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const unsubOrders = onValue(ref(db, 'companyOrders'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]: any) => ({ id: key, ...val }));
        setOrders(arr);
      } else {
        setOrders([]);
      }
    });
    
    const unsubSuppliers = onValue(ref(db, 'suppliers'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSuppliersCount(Object.keys(data).length);
      } else {
        setSuppliersCount(0);
      }
    });

    return () => { unsubOrders(); unsubSuppliers(); };
  }, []);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'Pending'), [orders]);
  const deliveredOrders = useMemo(() => orders.filter(o => o.status === 'Delivered'), [orders]);
  
  // Calculate top 5 suppliers by order count
  const supplierChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.companyName) {
        counts[o.companyName] = (counts[o.companyName] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return sorted.slice(0, 5);
  }, [orders]);

  // Oldest Pending Orders
  const oldestPending = useMemo(() => {
    const sorted = [...pendingOrders].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return sorted.slice(0, 3);
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
        <div style={{ background: "var(--gray-900)", padding: "32px 32px 40px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--brand-400)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "8px" }}>Enterprise Overview</p>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white", letterSpacing: "-0.04em", lineHeight: 1.2 }}>Welcome back</h1>
          <p style={{ marginTop: "8px", color: "var(--gray-400)", fontSize: "0.95rem", fontWeight: 500 }}>{today} · Here is what's happening today.</p>
        </div>

        <div className="page-content" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
          
          {/* Quick Metrics */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px'}}>
            <div className="card" style={{padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><AlertCircle size={24} /></div>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 900, lineHeight: 1}}>{pendingOrders.length}</div>
                <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px'}}>Pending Orders</div>
              </div>
            </div>
            
            <div className="card" style={{padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><TrendingUp size={24} /></div>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 900, lineHeight: 1}}>{deliveredOrders.length}</div>
                <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px'}}>Delivered Orders</div>
              </div>
            </div>

            <div className="card" style={{padding: '20px', display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Users size={24} /></div>
              <div>
                <div style={{fontSize: '2rem', fontWeight: 900, lineHeight: 1}}>{suppliersCount}</div>
                <div style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px'}}>Total Suppliers</div>
              </div>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px'}}>
            
            {/* Chart: Top Suppliers */}
            <div className="card" style={{padding: '24px', display: 'flex', flexDirection: 'column'}}>
              <h2 style={{fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px 0'}}>Top Suppliers (by Orders)</h2>
              <div style={{height: '240px', width: '100%', marginLeft: '-20px'}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={supplierChartData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{fill: 'var(--gray-50)'}} contentStyle={{borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)'}} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {supplierChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Action Items: Oldest Pending Orders */}
            <div className="card" style={{padding: '24px', display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2 style={{fontSize: '1.1rem', fontWeight: 800, margin: 0}}>Action Required: Pending Orders</h2>
                <Link href="/orders"><span style={{fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', cursor: 'pointer'}}>View All</span></Link>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', flex: 1}}>
                {oldestPending.length === 0 ? (
                  <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, background: 'var(--gray-50)', borderRadius: '8px'}}>All caught up! No pending orders.</div>
                ) : (
                  oldestPending.map(order => (
                    <div key={order.id} style={{padding: '14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <div style={{fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px'}}>{order.companyName}</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500}}>
                          <Clock size={12} /> {new Date(order.timestamp).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                      <div style={{background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700}}>
                        {order.items?.length || 0} Items
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Module Cards */}
          <h2 style={{fontSize: '1.1rem', fontWeight: 800, margin: '16px 0 0 0'}}>Modules</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <div className="module-card" style={{ height: "100%", padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div className="module-icon-wrap" style={{ background: `${item.color}14`, color: item.color, display: "flex", alignItems: "center", justifyContent: "center", margin: 0, width: '40px', height: '40px' }}>
                        <IconComponent size={20} />
                      </div>
                      <div className="module-shortcut" style={{position: 'static'}}>{item.shortcut}</div>
                    </div>
                    <div>
                      <div className="module-name" style={{fontSize: '1.05rem'}}>{item.name}</div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: item.color, marginTop: "3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.sub}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <p style={{ marginTop: "24px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-faint)", fontWeight: 500 }}>
            SHM-SYSTEM v2.0 · Professional Enterprise ERP
          </p>
        </div>
      </main>
    </div>
  );
}
