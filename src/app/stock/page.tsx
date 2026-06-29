"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { ref, onValue, update, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { Menu, Search, ChevronRight, Trash2, X, Zap, Package, Filter } from "lucide-react";

interface Product {
  productName?: string;
  partNumber?: string;
  name?: string;
  price?: number;
  [key: string]: any;
}

interface Group {
  groupName: string;
  productCount: number;
  products?: Record<string, Product> | Product[];
}

type RowItem = 
  | { type: 'group'; groupIndex: number; id: string }
  | { type: 'product'; groupIndex: number; productKey: string; id: string; product: any };

const QuickOrderModal = ({ product, purchaseOrders, suppliers, onClose, onSubmit }: any) => {
  const [partyName, setPartyName] = useState("");
  const [qty, setQty] = useState("");
  const partyRef = React.useRef<HTMLInputElement>(null);
  const qtyRef = React.useRef<HTMLInputElement>(null);

  const uniqueCompanies = useMemo(() => {
    const comps = new Set<string>();
    suppliers?.forEach((s: any) => comps.add(s.name));
    purchaseOrders?.forEach((o: any) => comps.add(o.companyName));
    return Array.from(comps);
  }, [purchaseOrders, suppliers]);

  useEffect(() => {
    setTimeout(() => partyRef.current?.focus(), 100);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const handlePartyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && partyName.trim()) {
      e.preventDefault();
      qtyRef.current?.focus();
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!partyName.trim() || !qty.trim()) return;
      onSubmit(partyName, qty);
    }
  };

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown} style={{position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="modal-content" style={{width: '400px', padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)'}}>
        <h2 style={{marginTop: 0, marginBottom: '4px', fontSize: '1.2rem', color: 'white'}}>Quick Add to Order</h2>
        <div style={{color: 'var(--primary)', fontWeight: 600, marginBottom: '20px', fontSize: '0.9rem'}}>{product.name} <span style={{color: 'var(--text-muted)'}}>{product.partNo ? `[${product.partNo}]` : ''}</span></div>
        
        <div style={{marginBottom: '16px'}}>
          <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px'}}>Supplier Name</label>
          <input
            ref={partyRef}
            list="supplier-list"
            value={partyName}
            onChange={e => setPartyName(e.target.value)}
            onKeyDown={handlePartyKeyDown}
            style={{width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '1rem'}}
            placeholder="Type and hit Enter..."
          />
          <datalist id="supplier-list">
            {uniqueCompanies.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div style={{marginBottom: '24px'}}>
          <label style={{display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px'}}>Quantity</label>
          <input
            ref={qtyRef}
            type="number"
            value={qty}
            onChange={e => setQty(e.target.value)}
            onKeyDown={handleQtyKeyDown}
            style={{width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--primary)', outline: 'none', fontWeight: 700, fontSize: '1.1rem'}}
            placeholder="0"
          />
        </div>

        <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
          <button className="action-btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="action-btn btn-primary" onClick={() => {
            if (partyName && qty) onSubmit(partyName, qty);
          }}>Add to Order (Enter)</button>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQuery2, setSearchQuery2] = useState("");
  const [groupFilter, setGroupFilter] = useState(""); // group filter dropdown
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Spotlight search state
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightQuery, setSpotlightQuery] = useState("");
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightRef = useRef<HTMLInputElement>(null);
  const spotlightListRef = useRef<HTMLDivElement>(null);

  // Cell-based focus state
  const [focusedCell, setFocusedCell] = useState({ r: -1, c: 0 });
  const [editingCell, setEditingCell] = useState<{ r: number, c: number } | null>(null);
  const [editForm, setEditForm] = useState({ value: '' });

  // Quick Order State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [quickOrderModalOpen, setQuickOrderModalOpen] = useState(false);
  const [quickOrderProduct, setQuickOrderProduct] = useState<{name: string, partNo: string} | null>(null);

  // Fetch data
  useEffect(() => {
    const groupsRef = ref(db, 'productLedger/groups');
    const unsubscribeGroups = onValue(groupsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const groupsArray = Array.isArray(data) 
          ? data 
          : Object.values(data);
        setGroups(groupsArray as Group[]);
      } else {
        setGroups([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firebase fetch error:", error);
      setLoading(false);
    });

    const ordersRef = ref(db, 'companyOrders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setPurchaseOrders(Object.values(data));
      else setPurchaseOrders([]);
    });

    const unsubscribeSuppliers = onValue(ref(db, 'suppliers'), (snapshot) => {
      const data = snapshot.val();
      if (data) setSuppliers(Object.values(data));
      else setSuppliers([]);
    });

    return () => { unsubscribeGroups(); unsubscribeOrders(); unsubscribeSuppliers(); };
  }, []);

  const handleQuickOrderSubmit = (partyName: string, qty: string) => {
    if (!quickOrderProduct) return;
    
    // Check if Pending order exists for this party
    const existingOrder = purchaseOrders.find(o => o.companyName.toLowerCase() === partyName.toLowerCase() && o.status === 'Pending');
    
    const newItem = {
      name: quickOrderProduct.name,
      partNo: quickOrderProduct.partNo,
      quantity: qty
    };

    if (existingOrder) {
      // Append to existing
      const orderRef = ref(db, `companyOrders/${existingOrder.id}`);
      update(orderRef, {
        items: [...(existingOrder.items || []), newItem],
        timestamp: new Date().toISOString()
      }).then(() => {
        setQuickOrderModalOpen(false);
      });
    } else {
      // Create new
      const newOrderRef = push(ref(db, 'companyOrders'));
      update(newOrderRef, {
        id: newOrderRef.key,
        companyName: partyName,
        items: [newItem],
        status: 'Pending',
        urgency: 'Normal',
        timestamp: new Date().toISOString()
      }).then(() => {
        setQuickOrderModalOpen(false);
      });
    }
  };

  // ── SPOTLIGHT SEARCH ──────────────────────────────────────────────
  // Flat list of all products for instant O(n) search
  const allProducts = useMemo(() => {
    const results: { name: string; partNo: string; groupName: string; groupIndex: number; productKey: string }[] = [];
    groups.forEach((group, gIndex) => {
      if (!group?.products) return;
      Object.entries(group.products).forEach(([key, p]: any) => {
        results.push({
          name: p.productName || p.name || '',
          partNo: p.partNumber || '',
          groupName: group.groupName || '',
          groupIndex: gIndex,
          productKey: key,
        });
      });
    });
    return results;
  }, [groups]);

  const spotlightResults = useMemo(() => {
    const q = spotlightQuery.toLowerCase().trim();
    if (!q) return allProducts.slice(0, 15);
    const terms = q.split(/\s+/).filter(Boolean);
    return allProducts
      .filter(p => {
        const hay = `${p.name} ${p.partNo} ${p.groupName}`.toLowerCase();
        return terms.every(t => hay.includes(t));
      })
      .slice(0, 40);
  }, [spotlightQuery, allProducts]);

  const openSpotlight = () => { setSpotlightOpen(true); setSpotlightIndex(0); setTimeout(() => spotlightRef.current?.focus(), 50); };
  const closeSpotlight = () => { setSpotlightOpen(false); setSpotlightQuery(''); setSpotlightIndex(0); };

  const jumpToProduct = (item: typeof spotlightResults[0]) => {
    setExpandedGroups(prev => ({ ...prev, [item.groupIndex]: true }));
    setSearchQuery(item.name);
    setSearchQuery2('');
    closeSpotlight();
    setTimeout(() => {
      const el = document.getElementById(`product-row-${item.groupIndex}-${item.productKey}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    const terms = query.trim().split(/\s+/);
    const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} style={{ background: '#fef08a', color: '#713f12', borderRadius: '2px', padding: '0 1px', fontWeight: 800 }}>{part}</mark> : part
    );
  };
  // ─────────────────────────────────────────────────────────────────

  // Compute visible rows for keyboard navigation and rendering
  const visibleRows = useMemo(() => {
    const rows: RowItem[] = [];
    
    // Extract all individual search words from both input boxes
    const searchTerms = [
      ...searchQuery.toLowerCase().trim().split(/\s+/),
      ...searchQuery2.toLowerCase().trim().split(/\s+/)
    ].filter(Boolean);
    
    const isSearchActive = searchTerms.length > 0 || !!groupFilter;

    groups.forEach((group, gIndex) => {
      if (!group) return;
      
      // Group filter by dropdown
      if (groupFilter && (group.groupName || '') !== groupFilter) return;

      const isExpanded = !!expandedGroups[gIndex];
      const productsList = group.products ? Object.entries(group.products) : [];
      const groupNameStr = (group.groupName || "").toLowerCase();
      
      const filteredProducts = searchTerms.length > 0 ? productsList.filter(([key, p]) => {
        const name = (p.productName || p.name || "").toLowerCase();
        const part = (p.partNumber || "").toLowerCase();
        const fullString = `${groupNameStr} ${name} ${part}`;
        return searchTerms.every(term => fullString.includes(term));
      }) : productsList;

      const groupMatches = searchTerms.every(term => groupNameStr.includes(term));
      
      if (isSearchActive && searchTerms.length > 0 && !groupMatches && filteredProducts.length === 0) {
        return;
      }

      rows.push({ type: 'group', groupIndex: gIndex, id: `g-${gIndex}` });

      if (isExpanded || isSearchActive) {
        filteredProducts.forEach(([key, product]) => {
          rows.push({ type: 'product', groupIndex: gIndex, productKey: key, id: `p-${gIndex}-${key}`, product });
        });
      }
    });
    return rows;
  }, [groups, expandedGroups, searchQuery, searchQuery2]);

  // Adjust focus if visible rows change
  useEffect(() => {
    if (focusedCell.r >= visibleRows.length) {
      setFocusedCell(prev => ({ ...prev, r: visibleRows.length > 0 ? visibleRows.length - 1 : -1 }));
    }
  }, [visibleRows.length, focusedCell.r]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in normal input (except our inline edit inputs and search)
      if (document.activeElement?.tagName === 'INPUT') {
        if (editingCell) {
          if (e.key === 'Escape') {
            setEditingCell(null);
            (document.activeElement as HTMLElement).blur();
          } else if (e.key === 'Enter') {
            saveEdit();
          }
        } else if (document.activeElement?.id === 'searchInput') {
          if (e.key === 'ArrowDown') {
            (document.activeElement as HTMLElement).blur();
            setFocusedCell({ r: 0, c: 0 });
            e.preventDefault();
          } else if (e.key === 'Escape') {
             (document.activeElement as HTMLElement).blur();
          }
        }
        return; 
      }

      // Ctrl+K → open spotlight
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSpotlight();
        return;
      }

      // Shortcut to focus filter search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
        return;
      }

      if (visibleRows.length === 0) return;

      if (editingCell) {
        if (e.key === 'Escape') {
          setEditingCell(null);
        } else if (e.key === 'Enter') {
          saveEdit();
        }
        return; // Lock navigation while editing
      }

      let { r, c } = focusedCell;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        r = Math.min(r + 1, visibleRows.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        r = Math.max(r - 1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (r >= 0 && r < visibleRows.length) {
           const row = visibleRows[r];
           // If on group name and collapsed, expand it. Otherwise move right.
           if (row.type === 'group' && c === 0 && !expandedGroups[row.groupIndex]) {
              setExpandedGroups(prev => ({...prev, [row.groupIndex]: true}));
           } else {
              c = Math.min(c + 1, 2);
           }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (r >= 0 && r < visibleRows.length) {
           const row = visibleRows[r];
           // If on group name and expanded, collapse it. Otherwise move left.
           if (row.type === 'group' && c === 0 && expandedGroups[row.groupIndex]) {
              setExpandedGroups(prev => ({...prev, [row.groupIndex]: false}));
           } else {
              c = Math.max(c - 1, 0);
           }
        }
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (r >= 0 && r < visibleRows.length) {
          const row = visibleRows[r];
          if (row.type === 'product') {
            setQuickOrderProduct({
              name: row.product?.productName || row.product?.name || '',
              partNo: row.product?.partNumber || ''
            });
            setQuickOrderModalOpen(true);
          } else if (row.type === 'group' && c === 0) {
            toggleGroup(row.groupIndex);
          }
        }
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'F2') {
        e.preventDefault();
        if (r >= 0 && r < visibleRows.length) {
          startEditing(r, c);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (r >= 0 && r < visibleRows.length) {
          const row = visibleRows[r];
          // Allow deletion if focused on the Actions column of a product
          if (row.type === 'product' && c === 2) {
            deleteProduct(row.groupIndex, row.productKey);
          }
        }
      }

      setFocusedCell({ r, c });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleRows, focusedCell, editingCell, editForm, searchQuery, searchQuery2, expandedGroups]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const startEditing = (r: number, c: number) => {
    const row = visibleRows[r];
    if (row.type === 'group' && c === 0) {
      setEditingCell({ r, c });
      setEditForm({ value: groups[row.groupIndex].groupName || '' });
    } else if (row.type === 'product' && c === 0) {
      setEditingCell({ r, c });
      setEditForm({ value: row.product?.productName || row.product?.name || '' });
    } else if (row.type === 'product' && c === 1) {
      setEditingCell({ r, c });
      setEditForm({ value: row.product?.partNumber || '' });
    }
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const { r, c } = editingCell;
    const row = visibleRows[r];
    
    if (row.type === 'group' && c === 0) {
      const groupRef = ref(db, `productLedger/groups/${row.groupIndex}`);
      update(groupRef, { groupName: editForm.value }).then(() => setEditingCell(null));
    } else if (row.type === 'product' && c === 0) {
      const productRef = ref(db, `productLedger/groups/${row.groupIndex}/products/${row.productKey}`);
      update(productRef, { productName: editForm.value }).then(() => setEditingCell(null));
    } else if (row.type === 'product' && c === 1) {
      const productRef = ref(db, `productLedger/groups/${row.groupIndex}/products/${row.productKey}`);
      update(productRef, { partNumber: editForm.value }).then(() => setEditingCell(null));
    }
  };

  const deleteProduct = (gIndex: number, pKey: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      const productRef = ref(db, `productLedger/groups/${gIndex}/products/${pKey}`);
      remove(productRef).catch(err => alert("Failed to delete: " + err.message));
    }
  };

  // Calculate totals
  const totalGroups = groups.filter(Boolean).length;
  const totalProducts = groups.reduce((acc, group) => {
    if (!group) return acc;
    return acc + (group.products ? Object.keys(group.products).length : (group.productCount || 0));
  }, 0);

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <div className="top-bar">
          <button className="mobile-menu-btn" style={{display: 'block', padding: 0, border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer'}} onClick={toggleSidebar}><Menu size={24} /></button>
          <div className="top-bar-left">
            <div className="breadcrumb">
              <span>SHM</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Stock Summary</span>
            </div>
          </div>
          <div className="top-bar-right">
            {/* Spotlight trigger button */}
            <button
              onClick={openSpotlight}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <Search size={14} />
              <span>Quick Search</span>
              <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontFamily: 'monospace', color: '#94a3b8', marginLeft: '4px' }}>Ctrl K</kbd>
            </button>
            <div className="top-bar-date">{new Date().toLocaleDateString('en-GB')}</div>
            <div className="user-profile"><div className="avatar">A</div></div>
          </div>
        </div>

        <div className="page-content">
          <div className="page-header">
            <div>
              <h1 className="heading-1">Stock Summary</h1>
              <p className="text-muted">Master list of product groups and their inventory.</p>
            </div>
            <div className="text-muted" style={{fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 'var(--radius-md)'}}>
              <kbd style={{background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid var(--border)'}}>↑↓←→</kbd> move &nbsp;·&nbsp;
              <kbd style={{background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid var(--border)'}}>Enter</kbd> edit &nbsp;·&nbsp;
              <kbd style={{background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid var(--border)'}}>Del</kbd> delete
            </div>
          </div>

          {/* Advanced Filter Bar */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Filter size={13} /> Filter
            </div>
            <div style={{ width: '1px', height: '20px', background: '#f1f5f9' }} />
            <input
              id="searchInput"
              type="text"
              placeholder="Product name or part no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: '160px', maxWidth: '260px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontSize: '0.875rem', outline: 'none', color: '#0f172a', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366f1', background: '#ede9fe', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.06em' }}>AND</span>
            <input
              id="searchInput2"
              type="text"
              placeholder="Second keyword..."
              value={searchQuery2}
              onChange={(e) => setSearchQuery2(e.target.value)}
              style={{ flex: 1, minWidth: '140px', maxWidth: '220px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px', fontSize: '0.875rem', outline: 'none', color: '#0f172a', fontFamily: 'inherit' }}
            />
            <div style={{ width: '1px', height: '20px', background: '#f1f5f9' }} />
            <select
              value={groupFilter}
              onChange={e => { setGroupFilter(e.target.value); setSearchQuery(''); setSearchQuery2(''); }}
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 10px', fontSize: '0.875rem', outline: 'none', color: '#0f172a', cursor: 'pointer', fontFamily: 'inherit', maxWidth: '180px' }}
            >
              <option value="">All Groups</option>
              {groups.filter(Boolean).map((g, i) => (
                <option key={i} value={g.groupName}>{g.groupName}</option>
              ))}
            </select>
            {(searchQuery || searchQuery2 || groupFilter) && (
              <>
                <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>
                  {visibleRows.filter(r => r.type === 'product').length} found
                </span>
                <button onClick={() => { setSearchQuery(''); setSearchQuery2(''); setGroupFilter(''); }} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={12} /> Clear
                </button>
              </>
            )}
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Total Groups</div>
              <div className="stat-value">{loading ? '—' : totalGroups}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Products</div>
              <div className="stat-value accent">{loading ? '—' : totalProducts}</div>
            </div>
          </div>

          {loading ? (
            <div>Loading data...</div>
          ) : (
            <div className="table-container">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th style={{width: '50%'}}>Group / Product Name</th>
                    <th>Part Number</th>
                    <th style={{textAlign: 'right'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{textAlign: 'center', padding: '32px'}}>
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, index) => {
                      if (row.type === 'group') {
                        const group = groups[row.groupIndex];
                        const isExpanded = !!expandedGroups[row.groupIndex] || !!searchQuery.trim() || !!searchQuery2.trim();
                        const tProducts = group.products ? Object.keys(group.products).length : 0;
                        const dCount = tProducts || group.productCount || 0;

                        const isEditingName = editingCell?.r === index && editingCell?.c === 0;

                        return (
                          <tr key={row.id} className={`ledger-row ${isExpanded ? 'expanded' : ''}`}>
                            <td 
                              className={focusedCell.r === index && focusedCell.c === 0 ? 'cell-focused' : ''}
                              onClick={() => { setFocusedCell({r: index, c: 0}); toggleGroup(row.groupIndex); }}
                              onDoubleClick={() => startEditing(index, 0)}
                              style={{fontWeight: 600, cursor: 'pointer'}}
                            >
                              {isEditingName ? (
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                  <span className={`accordion-icon ${isExpanded ? 'open' : ''}`} style={{display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginRight: '6px', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s'}}><ChevronRight size={16} /></span>
                                  <input 
                                    autoFocus
                                    className="inline-input"
                                    value={editForm.value}
                                    onChange={(e) => setEditForm({value: e.target.value})}
                                    onClick={e => e.stopPropagation()}
                                  />
                                </div>
                              ) : (
                                <>
                                  <span className={`accordion-icon ${isExpanded ? 'open' : ''}`} style={{display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginRight: '6px', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s'}}><ChevronRight size={16} /></span>
                                  {group.groupName || 'Unnamed Group'}
                                </>
                              )}
                            </td>
                            <td 
                              className={focusedCell.r === index && focusedCell.c === 1 ? 'cell-focused' : ''}
                              onClick={() => setFocusedCell({r: index, c: 1})}
                              style={{color: 'var(--text-muted)'}}
                            >
                              {dCount} Products
                            </td>
                            <td 
                              className={focusedCell.r === index && focusedCell.c === 2 ? 'cell-focused' : ''}
                              onClick={() => setFocusedCell({r: index, c: 2})}
                              style={{textAlign: 'right'}}
                            >
                              {isEditingName && (
                                <button className="action-btn btn-primary" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                              )}
                            </td>
                          </tr>
                        );
                      } else {
                        // Product Row
                        const isEditingName = editingCell?.r === index && editingCell?.c === 0;
                        const isEditingPart = editingCell?.r === index && editingCell?.c === 1;

                        return (
                          <tr key={row.id} id={`product-row-${row.groupIndex}-${row.productKey}`} className="sub-table">
                            <td 
                              className={focusedCell.r === index && focusedCell.c === 0 ? 'cell-focused' : ''}
                              onClick={() => setFocusedCell({r: index, c: 0})}
                              onDoubleClick={() => startEditing(index, 0)}
                              style={{paddingLeft: '48px', width: '50%'}}
                            >
                              {isEditingName ? (
                                <input 
                                  autoFocus
                                  className="inline-input"
                                  value={editForm.value}
                                  onChange={(e) => setEditForm({value: e.target.value})}
                                />
                              ) : (
                                row.product?.productName || row.product?.name || `Product ${row.productKey}`
                              )}
                            </td>
                            <td 
                              className={focusedCell.r === index && focusedCell.c === 1 ? 'cell-focused' : ''}
                              onClick={() => setFocusedCell({r: index, c: 1})}
                              onDoubleClick={() => startEditing(index, 1)}
                            >
                              {isEditingPart ? (
                                <input 
                                  autoFocus
                                  className="inline-input"
                                  value={editForm.value}
                                  onChange={(e) => setEditForm({value: e.target.value})}
                                />
                              ) : (
                                row.product?.partNumber ? (
                                  <span className="badge-outline">{row.product.partNumber}</span>
                                ) : (
                                  <span style={{color: 'var(--text-muted)'}}>-</span>
                                )
                              )}
                            </td>
                            <td 
                              className={focusedCell.r === index && focusedCell.c === 2 ? 'cell-focused' : ''}
                              onClick={() => setFocusedCell({r: index, c: 2})}
                              style={{textAlign: 'right'}}
                            >
                              {(isEditingName || isEditingPart) ? (
                                <button className="action-btn btn-primary" onClick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                              ) : (
                                <button className="action-btn btn-danger" style={{opacity: (focusedCell.r === index && focusedCell.c === 2) ? 1 : 0.4, padding: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}} title="Delete" onClick={(e) => { e.stopPropagation(); deleteProduct(row.groupIndex, row.productKey); }}><Trash2 size={16} /></button>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {quickOrderModalOpen && quickOrderProduct && (
          <QuickOrderModal
            product={quickOrderProduct}
            purchaseOrders={purchaseOrders}
            suppliers={suppliers}
            onClose={() => setQuickOrderModalOpen(false)}
            onSubmit={handleQuickOrderSubmit}
          />
        )}

        {/* ── SPOTLIGHT SEARCH MODAL ─────────────────────────── */}
        {spotlightOpen && (
          <div
            onClick={closeSpotlight}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Escape') closeSpotlight();
                if (e.key === 'ArrowDown') { e.preventDefault(); setSpotlightIndex(i => Math.min(i + 1, spotlightResults.length - 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setSpotlightIndex(i => Math.max(i - 1, 0)); }
                if (e.key === 'Enter' && spotlightResults[spotlightIndex]) jumpToProduct(spotlightResults[spotlightIndex]);
              }}
              style={{ width: '100%', maxWidth: '640px', background: 'white', borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', border: '1px solid #e2e8f0' }}
            >
              {/* Search input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <Search size={18} style={{ color: '#6366f1', flexShrink: 0 }} />
                <input
                  ref={spotlightRef}
                  type="text"
                  value={spotlightQuery}
                  onChange={e => { setSpotlightQuery(e.target.value); setSpotlightIndex(0); }}
                  placeholder="Search any product, part number, or group..."
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', fontWeight: 500, color: '#0f172a', fontFamily: 'inherit', background: 'transparent' }}
                />
                {spotlightQuery && (
                  <button onClick={() => setSpotlightQuery('')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={14} /></button>
                )}
                <kbd onClick={closeSpotlight} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 8px', fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer', fontFamily: 'monospace' }}>ESC</kbd>
              </div>

              {/* Results list */}
              <div ref={spotlightListRef} style={{ maxHeight: '460px', overflowY: 'auto' }}>
                {spotlightResults.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No products found for "{spotlightQuery}"</div>
                ) : (
                  <>
                    <div style={{ padding: '10px 20px 6px', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {spotlightQuery ? `${spotlightResults.length} results` : 'All Products (showing 15)'}
                    </div>
                    {spotlightResults.map((item, i) => (
                      <div
                        key={`${item.groupIndex}-${item.productKey}`}
                        onClick={() => jumpToProduct(item)}
                        onMouseEnter={() => setSpotlightIndex(i)}
                        style={{
                          padding: '11px 20px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: i === spotlightIndex ? '#f5f3ff' : 'white',
                          borderLeft: i === spotlightIndex ? '3px solid #6366f1' : '3px solid transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ede9fe', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {highlightText(item.name || '(No Name)', spotlightQuery)}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#6366f1', background: '#ede9fe', padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>{item.groupName}</span>
                            {item.partNo && <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{highlightText(item.partNo, spotlightQuery)}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            onClick={e => { e.stopPropagation(); setQuickOrderProduct({ name: item.name, partNo: item.partNo }); setQuickOrderModalOpen(true); closeSpotlight(); }}
                            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >+ Order</button>
                          <button style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>Jump ↵</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}><kbd style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace' }}>↑↓</kbd> navigate</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}><kbd style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace' }}>Enter</kbd> jump to product</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}><kbd style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '1px 5px', fontFamily: 'monospace' }}>Esc</kbd> close</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8' }}>{allProducts.length.toLocaleString()} products indexed</span>
              </div>
            </div>
          </div>
        )}
        {/* ────────────────────────────────────────────────────── */}
      </main>
    </div>
  );
}
