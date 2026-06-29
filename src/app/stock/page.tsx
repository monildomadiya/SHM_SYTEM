"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ref, onValue, update, remove, push } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { Menu, Search, ChevronRight, Trash2 } from "lucide-react";

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
  const [suppliers, setSuppliers] = useState<any[]>([]);
  
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

  // Compute visible rows for keyboard navigation and rendering
  const visibleRows = useMemo(() => {
    const rows: RowItem[] = [];
    
    groups.forEach((group, gIndex) => {
      if (!group) return; // Skip nulls in arrays
      
      const isExpanded = !!expandedGroups[gIndex];
      const productsList = group.products ? Object.entries(group.products) : [];
      
      // Filter products by search
      const filteredProducts = productsList.filter(([key, p]) => {
        const name = (p.productName || p.name || "").toLowerCase();
        const part = (p.partNumber || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || part.includes(query);
      });

      const groupMatches = (group.groupName || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      if (searchQuery && !groupMatches && filteredProducts.length === 0) {
        return; // Skip this group entirely if no match
      }

      rows.push({ type: 'group', groupIndex: gIndex, id: `g-${gIndex}` });

      if (isExpanded || searchQuery) {
        filteredProducts.forEach(([key, product]) => {
          rows.push({ type: 'product', groupIndex: gIndex, productKey: key, id: `p-${gIndex}-${key}`, product });
        });
      }
    });
    return rows;
  }, [groups, expandedGroups, searchQuery]);

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

      // Shortcut to focus search
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
  }, [visibleRows, focusedCell, editingCell, editForm, searchQuery, expandedGroups]);

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
            <div className="search-container">
              <span className="search-icon" style={{display: 'flex', alignItems: 'center'}}><Search size={16} /></span>
              <input
                id="searchInput"
                type="text"
                className="search-input"
                placeholder="Search products... ('/')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
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
                        const isExpanded = !!expandedGroups[row.groupIndex] || !!searchQuery;
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
                          <tr key={row.id} className="sub-table">
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
      </main>
    </div>
  );
}
