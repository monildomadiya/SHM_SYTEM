"use client";

import React, { useEffect, useState } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { Users, Search, Plus, Edit, Trash2, X, Building, Phone, MapPin, CheckCircle, Menu } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  gstin: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", gstin: "" });

  useEffect(() => {
    const unsub = onValue(ref(db, 'suppliers'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]: any) => ({ id: key, ...val }));
        arr.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setSuppliers(arr);
      } else setSuppliers([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery) ||
    s.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openNewSupplier = () => { setEditingSupplier(null); setForm({ name: "", phone: "", address: "", gstin: "" }); setShowModal(true); };
  const openEditSupplier = (s: Supplier) => { setEditingSupplier(s); setForm({ name: s.name, phone: s.phone || "", address: s.address || "", gstin: s.gstin || "" }); setShowModal(true); };
  const handleDelete = (id: string) => { if (confirm("Delete this supplier?")) remove(ref(db, `suppliers/${id}`)); };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Name is required");
    if (editingSupplier) update(ref(db, `suppliers/${editingSupplier.id}`), form).then(() => setShowModal(false));
    else push(ref(db, 'suppliers'), form).then(() => setShowModal(false));
  };

  // Get initials for avatar
  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarColors = ['#6366f1','#0891b2','#16a34a','#d97706','#dc2626','#7c3aed','#059669','#db2777'];
  const getColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">

        {/* Top Bar */}
        <div className="top-bar">
          <button className="mobile-menu-btn" style={{ display: 'block', padding: 0, border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="top-bar-left">
            <div className="breadcrumb">
              <span>SHM</span><span className="breadcrumb-sep">/</span><span className="breadcrumb-current">Suppliers</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="top-bar-right">
            <div className="top-bar-date">{new Date().toLocaleDateString('en-GB')}</div>
            <div className="user-profile"><div className="avatar">A</div></div>
          </div>
        </div>

        <div className="page-content">
          <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 className="heading-1">Suppliers <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: '1.2rem' }}>({suppliers.length})</span></h1>
                <p className="text-muted">Master database of all party accounts and suppliers.</p>
              </div>
              <button className="action-btn btn-primary" onClick={openNewSupplier} style={{ padding: '10px 20px', borderRadius: '100px', fontWeight: 700, boxShadow: '0 4px 12px rgba(79,70,229,0.25)', gap: '8px' }}>
                <Plus size={17} /> New Supplier
              </button>
            </header>

            {/* Card with search + table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {/* Card Header with Search */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or GSTIN..."
                    className="input-field"
                    style={{ paddingLeft: '34px', height: '38px', fontSize: '0.875rem', background: 'white' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchQuery && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {filteredSuppliers.length} result{filteredSuppliers.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '3px 10px', borderRadius: '100px', border: '1px solid #e2e8f0' }}>
                  {suppliers.length} Total
                </span>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc' }}>Party Name</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc', width: '160px' }}>Phone</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc', width: '210px' }}>GSTIN</th>
                      <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', background: '#f8fafc' }}>City / Address</th>
                      <th style={{ padding: '12px 20px', background: '#f8fafc', width: '100px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5}><div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading suppliers...</div></td></tr>
                    ) : filteredSuppliers.length === 0 ? (
                      <tr><td colSpan={5}>
                        <div className="empty-state">
                          <div className="empty-state-icon"><Users size={22} /></div>
                          <div className="empty-state-title">{searchQuery ? 'No results found' : 'No suppliers yet'}</div>
                          <div className="empty-state-desc">{searchQuery ? `No supplier matches "${searchQuery}"` : 'Click "New Supplier" to add your first supplier.'}</div>
                        </div>
                      </td></tr>
                    ) : filteredSuppliers.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }} className="ledger-row">
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: getColor(s.name), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                              {getInitials(s.name)}
                            </div>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#475569', fontWeight: 500, fontSize: '0.875rem' }}>{s.phone || '—'}</td>
                        <td style={{ padding: '14px 20px', fontFamily: 'ui-monospace, monospace', fontSize: '0.82rem', color: '#64748b' }}>{s.gstin || '—'}</td>
                        <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.875rem' }}>{s.address || '—'}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <div className="row-actions">
                            <button onClick={() => openEditSupplier(s)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '6px', borderRadius: '6px', display: 'inline-flex', cursor: 'pointer' }} title="Edit">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => handleDelete(s.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '6px', borderRadius: '6px', display: 'inline-flex', cursor: 'pointer' }} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Supplier Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', animation: 'scaleIn 0.2s ease-out' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>Ledger entry for party account</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label className="form-label">Party A/c Name <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Building size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: '36px' }} autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Auto Parts" required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="text" className="input-field" style={{ paddingLeft: '36px' }} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input type="text" className="input-field" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} placeholder="GSTIN..." style={{ textTransform: 'uppercase' }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">City / Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={15} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                  <textarea className="input-field" style={{ paddingLeft: '36px', minHeight: '76px', resize: 'vertical' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address or city..."></textarea>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="action-btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="action-btn btn-primary" style={{ gap: '8px' }}>
                  <CheckCircle size={16} />{editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
