"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ref, onValue, push, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { Menu, Trash2, ChevronRight } from "lucide-react";

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
        const arr = Object.entries(data).map(([key, val]: any) => ({
          id: key,
          ...val,
        }));
        arr.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(arr);
      } else {
        setLogs([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(inputQty, 10);
    if (!qty || qty <= 0) return;
    push(ref(db, "teaTracker/logs"), {
      quantity: qty,
      timestamp: Date.now(),
    }).then(() => setInputQty("")).catch((err) => alert("Error: " + err.message));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this entry?")) {
      remove(ref(db, `teaTracker/logs/${id}`));
    }
  };

  const toggleDate = (dateStr: string) => {
    setExpandedDates((prev) => ({ ...prev, [dateStr]: !prev[dateStr] }));
  };

  const { groupedLogs, stats } = useMemo(() => {
    const groups: Record<string, TeaLog[]> = {};
    let totalAllTime = 0;
    let totalToday = 0;
    const todayStr = new Date().toLocaleDateString("en-GB");

    logs.forEach((log) => {
      totalAllTime += log.quantity;
      const dateStr = new Date(log.timestamp).toLocaleDateString("en-GB");
      if (dateStr === todayStr) totalToday += log.quantity;
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    });

    return {
      groupedLogs: groups,
      stats: { totalAllTime, totalToday, totalDeliveries: logs.length },
    };
  }, [logs]);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <button
            className="mobile-menu-btn"
            style={{ display: "block", padding: 0, border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer" }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="top-bar-left">
            <div className="breadcrumb">
              <span>SHM</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Tea Tracker</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="top-bar-right">
            <div className="top-bar-date">{new Date().toLocaleDateString("en-GB")}</div>
            <div className="user-profile">
              <div className="avatar">A</div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="heading-1">Tea Tracker</h1>
              <p className="text-muted">Professional daily tea consumption ledger.</p>
            </div>
          </div>

          {/* Top Section: Entry + Stats */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            {/* Quick Entry */}
            <div
              className="card"
              style={{ flex: "1 1 300px", padding: "24px" }}
            >
              <h3 className="heading-2" style={{ marginBottom: "16px" }}>
                Quick Entry
              </h3>
              <form onSubmit={handleAddLog} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="number"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                  placeholder="Number of cups..."
                  className="inline-input"
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="action-btn btn-primary"
                >
                  Log Tea ↵
                </button>
              </form>
            </div>

            {/* Stats */}
            <div
              style={{
                flex: "2 1 500px",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
              }}
            >
              <div className="stat-card">
                <div className="stat-label">Today's Total</div>
                <div className="stat-value accent">
                  {stats.totalToday}{" "}
                  <span className="stat-unit">cups</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">All-Time Total</div>
                <div className="stat-value">
                  {stats.totalAllTime}{" "}
                  <span className="stat-unit">cups</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Deliveries</div>
                <div className="stat-value">{stats.totalDeliveries}</div>
              </div>
            </div>
          </div>

          {/* Grouped Ledger */}
          <div className="table-container">
            <div
              className="card-header"
              style={{ borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}
            >
              <h2 className="heading-2">Tea Delivery Log</h2>
              <span className="badge badge-neutral">Grouped by Date</span>
            </div>

            <div style={{ overflowY: "auto", maxHeight: "520px" }}>
              {loading ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Loading ledger...
                </div>
              ) : Object.keys(groupedLogs).length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  No tea logs yet. Add your first entry above!
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
                      const isToday = dateStr === new Date().toLocaleDateString("en-GB");
                      const isExpanded = expandedDates[dateStr] ?? true;

                      return (
                        <React.Fragment key={dateStr}>
                          {/* Group row */}
                          <tr
                            className="ledger-row group-row"
                            onClick={() => toggleDate(dateStr)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <span
                                className="accordion-icon"
                                style={{
                                  transform: isExpanded ? "rotate(90deg)" : "none",
                                  transition: "transform 0.2s",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  verticalAlign: "middle",
                                  marginRight: "8px"
                                }}
                              >
                                <ChevronRight size={16} />
                              </span>
                              {isToday ? (
                                <>
                                  <strong>Today</strong>
                                  <span
                                    style={{
                                      marginLeft: "8px",
                                      fontSize: "0.75rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    ({dateStr})
                                  </span>
                                </>
                              ) : (
                                dateStr
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span className="badge badge-primary">
                                {dayTotal} cups
                              </span>
                            </td>
                            <td />
                          </tr>

                          {/* Delivery rows */}
                          {isExpanded &&
                            dayLogs.map((log) => (
                              <tr key={log.id} className="ledger-row sub-table">
                                <td style={{ paddingLeft: "48px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                                  {new Date(log.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                                <td style={{ textAlign: "right", fontWeight: 700 }}>
                                  {log.quantity}{" "}
                                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                                    cups
                                  </span>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    className="action-btn btn-danger"
                                    style={{ padding: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                    onClick={(e) => handleDelete(log.id, e)}
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
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
