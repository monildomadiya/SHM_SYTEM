"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ref, onValue, push, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { Menu, Coffee, Trash2, ChevronRight, Plus } from "lucide-react";

interface TeaLog {
  id: string;
  quantity: number;
  timestamp: number;
}

export default function TeaTracker() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logs, setLogs] = useState<TeaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputQty, setInputQty] = useState("");
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const logsRef = ref(db, "teaTracker/logs");
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]: any) => ({ id: key, ...val }));
        arr.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setLogs(arr);
      } else setLogs([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(inputQty, 10);
    if (!qty || qty <= 0) return;
    push(ref(db, "teaTracker/logs"), { quantity: qty, timestamp: Date.now() })
      .then(() => setInputQty(""))
      .catch((err) => alert("Error: " + err.message));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this entry?")) remove(ref(db, `teaTracker/logs/${id}`));
  };

  const toggleDate = (dateStr: string) => setExpandedDates((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));

  const { groupedLogs, stats } = useMemo(() => {
    const groups: Record<string, TeaLog[]> = {};
    let totalAllTime = 0, totalToday = 0;
    const todayStr = new Date().toLocaleDateString("en-GB");
    logs.forEach((log) => {
      totalAllTime += log.quantity;
      const dateStr = new Date(log.timestamp).toLocaleDateString("en-GB");
      if (dateStr === todayStr) totalToday += log.quantity;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    });
    return { groupedLogs: groups, stats: { totalAllTime, totalToday, totalDeliveries: logs.length } };
  }, [logs]);

  const todayStr = new Date().toLocaleDateString("en-GB");

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <button className="mobile-menu-btn" style={{ display: "block", padding: 0, border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="top-bar-left">
            <div className="breadcrumb">
              <span>SHM</span><span className="breadcrumb-sep">/</span><span className="breadcrumb-current">Tea Tracker</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="top-bar-right">
            <div className="top-bar-date">{new Date().toLocaleDateString("en-GB")}</div>
            <div className="user-profile"><div className="avatar">A</div></div>
          </div>
        </div>

        <div className="page-content">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="heading-1">☕ Tea Tracker</h1>
              <p className="text-muted">Daily office tea consumption ledger.</p>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div className="card" style={{ padding: "20px 24px", borderLeft: "3px solid #f59e0b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Coffee size={16} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Today's Total</span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#d97706", lineHeight: 1 }}>{stats.totalToday}<span style={{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8", marginLeft: "4px" }}>cups</span></div>
            </div>

            <div className="card" style={{ padding: "20px 24px", borderLeft: "3px solid #6366f1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#ede9fe", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Coffee size={16} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>All-Time Total</span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{stats.totalAllTime}<span style={{ fontSize: "1rem", fontWeight: 600, color: "#94a3b8", marginLeft: "4px" }}>cups</span></div>
            </div>

            <div className="card" style={{ padding: "20px 24px", borderLeft: "3px solid #10b981" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#d1fae5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Entries</span>
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{stats.totalDeliveries}</div>
            </div>
          </div>

          {/* Quick Entry Card */}
          <div className="card" style={{ padding: "28px 32px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 16px 0", color: "#0f172a" }}>Log Tea ☕</h3>
            <form onSubmit={handleAddLog} style={{ display: "flex", gap: "12px", alignItems: "flex-end", maxWidth: "480px" }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Number of Cups</label>
                <input
                  type="number"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  placeholder="Enter quantity..."
                  className="input-field"
                  autoFocus
                  min={1}
                />
              </div>
              <button type="submit" className="action-btn btn-primary" style={{ height: "42px", paddingInline: "24px", borderRadius: "var(--radius-full)", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)", background: "#d97706", fontSize: "0.9rem" }}>
                Log Tea ↵
              </button>
            </form>
          </div>

          {/* Delivery Log */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h2 style={{ fontSize: "0.85rem", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>Tea Delivery Log</h2>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", background: "#f1f5f9", padding: "3px 10px", borderRadius: "100px", border: "1px solid #e2e8f0" }}>Grouped by Date</span>
            </div>

            <div style={{ overflowY: "auto", maxHeight: "520px" }}>
              {loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>
              ) : Object.keys(groupedLogs).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Coffee size={22} /></div>
                  <div className="empty-state-title">No tea logs yet</div>
                  <div className="empty-state-desc">Add your first entry using the form above.</div>
                </div>
              ) : (
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th style={{ textAlign: "right" }}>Cups</th>
                      <th style={{ textAlign: "right", width: "80px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedLogs).map(([dateStr, dayLogs]) => {
                      const dayTotal = dayLogs.reduce((s, l) => s + l.quantity, 0);
                      const isToday = dateStr === todayStr;
                      const isExpanded = expandedDates[dateStr] ?? true;
                      return (
                        <React.Fragment key={dateStr}>
                          <tr onClick={() => toggleDate(dateStr)} style={{ cursor: "pointer", background: isToday ? "#fffbeb" : "#f8fafc" }}>
                            <td style={{ fontWeight: 700, color: isToday ? "#d97706" : "#0f172a", borderLeft: isToday ? "3px solid #f59e0b" : "3px solid transparent" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", marginRight: "8px", transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                                <ChevronRight size={14} style={{ color: "#94a3b8" }} />
                              </span>
                              {isToday ? <><strong>Today</strong><span style={{ marginLeft: "8px", fontSize: "0.75rem", color: "#94a3b8" }}>({dateStr})</span></> : dateStr}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span style={{ background: isToday ? "#fef3c7" : "#f1f5f9", color: isToday ? "#d97706" : "#475569", padding: "3px 10px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 700 }}>{dayTotal} cups</span>
                            </td>
                            <td />
                          </tr>
                          {isExpanded && dayLogs.map((log) => (
                            <tr key={log.id} style={{ background: isToday ? "#fffdf0" : "white" }}>
                              <td style={{ paddingLeft: "48px", color: "#64748b", fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}>
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 700 }}>
                                {log.quantity} <span style={{ color: "#94a3b8", fontWeight: 500 }}>cups</span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div className="row-actions">
                                  <button className="action-btn" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", padding: "5px", borderRadius: "6px", display: "inline-flex" }} onClick={(e) => handleDelete(log.id, e)} title="Delete">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
