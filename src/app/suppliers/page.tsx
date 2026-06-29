"use client";

import React, { useEffect, useState } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { Users, Search, Plus, Edit, Trash2, X, Building, Phone, MapPin, CheckCircle } from "lucide-react";

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
        const arr = Object.entries(data).map(([key, val]: any) => ({
          id: key,
          ...val
        }));
        arr.sort((a, b) => a.name.localeCompare(b.name));
        setSuppliers(arr);
      } else {
        setSuppliers([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.phone.includes(searchQuery) || 
    s.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setForm({ name: "", phone: "", address: "", gstin: "" });
    setShowModal(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({ name: s.name, phone: s.phone || "", address: s.address || "", gstin: s.gstin || "" });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      remove(ref(db, `suppliers/${id}`));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Name is required");

    if (editingSupplier) {
      update(ref(db, `suppliers/${editingSupplier.id}`), form)
        .then(() => setShowModal(false));
    } else {
      push(ref(db, 'suppliers'), form)
        .then(() => setShowModal(false));
    }
  };

  return (
    <div className="layout-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="main-content">
        <div style={{maxWidth: '1200px', margin: '0 auto', width: '100%'}}>
          
          <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px'}}>
            <div>
              <h1 className="heading-1" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Suppliers (Ledgers)</h1>
              <p className="text-muted" style={{ fontSize: '0.95rem' }}>Master database of all party accounts and suppliers.</p>
            </div>
            <button className="action-btn btn-primary" onClick={openNewSupplier} style={{ padding: '10px 20px', borderRadius: 'var(--radius-full)', fontWeight: 600, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}>
              <Plus size={18} />
              New Supplier
            </button>
          </header>

          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
            <div style={{position: 'relative', flex: 1, maxWidth: '480px'}}>
              <div style={{position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search suppliers by name, phone, or GSTIN..." 
                className="input-field"
                style={{paddingLeft: '44px', width: '100%', height: '48px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', fontSize: '0.95rem'}}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div className="table-container" style={{ margin: 0 }}>
              <table className="ledger-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Party Name</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '180px' }}>Phone</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '220px' }}>GSTIN</th>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>City / Address</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>Action</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>Loading suppliers...</td></tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>No suppliers found.</td></tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="ledger-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s ease' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#0f172a' }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Building size={16} />
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#475569', fontWeight: 500 }}>{s.phone || '—'}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'ui-monospace, monospace', fontSize: '0.9rem', color: '#64748b' }}>{s.gstin || '—'}</td>
                      <td style={{ padding: '16px 20px', color: '#64748b' }}>{s.address || '—'}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'}}>
                          <button className="action-btn" onClick={() => openEditSupplier(s)} style={{background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', padding: '6px', borderRadius: '6px'}} title="Edit">
                            <Edit size={16} />
                          </button>
                          <button className="action-btn" onClick={() => handleDelete(s.id)} style={{background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px'}} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>
          
        </div>
      </main>

      {/* Supplier Modal */}
      {showModal && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>
          <div className="card" style={{width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', animation: 'scaleIn 0.2s ease-out'}}>
            <div style={{padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{fontSize: '1.25rem', fontWeight: 700, margin: 0}}>{editingSupplier ? 'Edit Supplier Ledger' : 'New Supplier Ledger'}</h2>
              <button onClick={() => setShowModal(false)} style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div className="form-group">
                <label className="form-label">Party A/c Name <span style={{color: 'var(--danger)'}}>*</span></label>
                <div style={{position: 'relative'}}>
                  <Building size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
                  <input type="text" className="input-field" autoFocus style={{paddingLeft: '40px'}} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Acme Auto Parts" required />
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{position: 'relative'}}>
                    <Phone size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
                    <input type="text" className="input-field" style={{paddingLeft: '40px'}} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone..." />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input type="text" className="input-field" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} placeholder="GSTIN..." style={{textTransform: 'uppercase'}} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">City / Address</label>
                <div style={{position: 'relative'}}>
                  <MapPin size={18} style={{position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)'}} />
                  <textarea className="input-field" style={{paddingLeft: '40px', minHeight: '80px', resize: 'vertical'}} value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address or City..."></textarea>
                </div>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px'}}>
                <button type="button" className="action-btn" onClick={() => setShowModal(false)} style={{padding: '10px 20px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', fontWeight: 600}}>
                  Cancel
                </button>
                <button type="submit" className="action-btn btn-primary" style={{padding: '10px 20px'}}>
                  <CheckCircle size={18} />
                  {editingSupplier ? 'Update Ledger' : 'Create Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
