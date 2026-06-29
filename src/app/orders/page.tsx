"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import Sidebar from "@/components/Sidebar";
import { AlertTriangle, X, ArrowRight, Check, Menu, ChevronDown, Download, Edit, Trash2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

export interface OrderItem {
  name: string;
  partNo?: string;
  quantity: string;
}

interface CompanyOrder {
  id: string;
  companyName: string;
  items: OrderItem[];
  status: 'Pending' | 'Sent' | 'Delivered';
  urgency: 'Normal' | 'Urgent' | 'Critical';
  timestamp: string;
}

interface InventoryItem {
  partNo: string;
  productName: string;
  groupName: string;
}

export interface Supplier {
  id: string;
  name: string;
}

const TallyOrderForm = ({ onClose, inventory, suppliers, onSubmit, initialOrder }: { onClose: () => void, inventory: InventoryItem[], suppliers: Supplier[], onSubmit: (order: any) => void, initialOrder?: CompanyOrder | null }) => {
  const [partyName, setPartyName] = useState(initialOrder?.companyName || "");
  const [items, setItems] = useState<OrderItem[]>(
    initialOrder?.items ? [...initialOrder.items, { name: "", quantity: "", partNo: "" }] : [{ name: "", quantity: "", partNo: "" }]
  );
  
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [activeCol, setActiveCol] = useState<'name' | 'qty'>('name');
  const [searchQuery, setSearchQuery] = useState(initialOrder?.items?.[0]?.name || "");
  const [listActiveIndex, setListActiveIndex] = useState(0);

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companyFocusIndex, setCompanyFocusIndex] = useState(0);
  const [companySearchStr, setCompanySearchStr] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [focusedSection, setFocusedSection] = useState<'party' | 'company' | 'grid' | 'stock'>('party');
  const companyTriggerRef = useRef<HTMLButtonElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const companySearchInputRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setCompanyDropdownOpen(false);
        setCompanySearchStr('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCompany = (g: string) => {
    setSelectedCompanies(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
    setListActiveIndex(0);
  };

  const handleCompanyKeyDown = (e: React.KeyboardEvent) => {
    // Tab: always close dropdown and jump directly to Name of Item input
    if (e.key === 'Tab') {
      e.preventDefault();
      setCompanyDropdownOpen(false);
      setCompanySearchStr('');
      // Small delay to let state settle, then focus the name input
      setTimeout(() => nameInputRef.current?.focus(), 0);
      return;
    }

    // Backspace on trigger (dropdown closed): remove last selected company
    if (e.key === 'Backspace' && !companyDropdownOpen) {
      e.preventDefault();
      setSelectedCompanies(prev => prev.slice(0, -1));
      setListActiveIndex(0);
      return;
    }

    if (!companyDropdownOpen) {
      if (e.key === 'Enter' || (e.key === ' ' && e.target !== companySearchInputRef.current) || e.key === 'ArrowDown') {
        e.preventDefault();
        setCompanyDropdownOpen(true);
        setCompanyFocusIndex(0);
        setTimeout(() => companySearchInputRef.current?.focus(), 0);
      }
      return;
    }

    // Dropdown is open:
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      setCompanyDropdownOpen(false);
      setCompanySearchStr('');
      companyTriggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // "All" + N items if search is empty, otherwise just N items
      const maxIndex = companySearchStr ? filteredUniqueGroups.length - 1 : filteredUniqueGroups.length;
      setCompanyFocusIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCompanyFocusIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || (e.key === ' ' && e.target !== companySearchInputRef.current)) {
      e.preventDefault();
      if (!companySearchStr && companyFocusIndex === 0) {
        setSelectedCompanies([]);
        setListActiveIndex(0);
      } else {
        const actualIdx = companySearchStr ? companyFocusIndex : companyFocusIndex - 1;
        if (filteredUniqueGroups[actualIdx]) {
          toggleCompany(filteredUniqueGroups[actualIdx]);
        }
      }
    }
  };

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    inventory.forEach(i => i.groupName && groups.add(i.groupName));
    return Array.from(groups).sort();
  }, [inventory]);

  const filteredUniqueGroups = useMemo(() => {
    if (!companySearchStr) return uniqueGroups;
    return uniqueGroups.filter(g => g.toLowerCase().includes(companySearchStr.toLowerCase()));
  }, [uniqueGroups, companySearchStr]);

  const filteredStock = useMemo(() => {
    let filtered = inventory;
    if (selectedCompanies.length > 0) {
      filtered = filtered.filter(i => i.groupName && selectedCompanies.includes(i.groupName));
    }
    if (!searchQuery) return filtered.slice(0, 100);
    return filtered.filter(i => i.productName.toLowerCase().includes(searchQuery.toLowerCase()) || i.partNo.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 50);
  }, [inventory, searchQuery, selectedCompanies]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const activeListItemRef = useRef<HTMLDivElement>(null);
  const activeCompanyItemRef = useRef<HTMLDivElement>(null);
  const partyInputRef = useRef<HTMLInputElement>(null);
  const stockPanelRef = useRef<HTMLDivElement>(null);
  const isFirstMount = useRef(true);

  // Global Shortcuts
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const isPartyEmpty = !partyInputRef.current?.value.trim();
      
      if (e.altKey) {
        if (isPartyEmpty && ['c', 'q'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          setSubmitError('Enter Party A/c Name first!');
          partyInputRef.current?.focus();
          setTimeout(() => setSubmitError(''), 3000);
          return;
        }
        
        switch (e.key.toLowerCase()) {
          case 'p': e.preventDefault(); partyInputRef.current?.focus(); break;
          case 'c': e.preventDefault(); companyTriggerRef.current?.focus(); break;
          case 'q': e.preventDefault(); setActiveCol('qty'); setTimeout(() => qtyInputRef.current?.focus(), 0); break;
        }
      } else if (e.shiftKey) {
        if (isPartyEmpty && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          setSubmitError('Enter Party A/c Name first!');
          partyInputRef.current?.focus();
          setTimeout(() => setSubmitError(''), 3000);
          return;
        }
        
        if (e.key === 'ArrowLeft') {
          e.preventDefault(); setActiveCol('name'); setTimeout(() => nameInputRef.current?.focus(), 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault(); setActiveCol('name'); setTimeout(() => stockPanelRef.current?.focus(), 0);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    if (activeCompanyItemRef.current) {
      activeCompanyItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [companyFocusIndex]);

  useEffect(() => {
    if (activeListItemRef.current) {
      activeListItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [listActiveIndex]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setTimeout(() => partyInputRef.current?.focus(), 50);
      return;
    }
    
    if (activeCol === 'name') {
      nameInputRef.current?.focus();
    } else {
      qtyInputRef.current?.focus();
    }
  }, [activeRowIndex, activeCol]);

  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const handleCloseRequest = () => {
    const hasData = partyName.trim() !== "" || items.length > 1 || (items[0].name !== "" || items[0].quantity !== "");
    if (hasData) {
      setShowQuitConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showQuitConfirm) {
        if (e.key.toLowerCase() === 'y' || e.key === 'Enter') {
          onClose();
        } else if (e.key.toLowerCase() === 'n' || e.key === 'Escape') {
          setShowQuitConfirm(false);
          e.stopPropagation();
        }
        return;
      }

      if (e.key === 'Escape') {
        handleCloseRequest();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onClose, partyName, items, showQuitConfirm]);

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isEditing = searchQuery !== (items[activeRowIndex].name || "");

    if (e.key === 'ArrowDown') {
      if (isEditing && filteredStock.length > 0) {
        e.preventDefault();
        setListActiveIndex(prev => Math.min(prev + 1, filteredStock.length - 1));
      } else {
        e.preventDefault();
        if (activeRowIndex < items.length - 1) {
          setActiveRowIndex(activeRowIndex + 1);
          setSearchQuery(items[activeRowIndex + 1].name || "");
        }
      }
    } else if (e.key === 'ArrowUp') {
      if (isEditing && filteredStock.length > 0) {
        e.preventDefault();
        setListActiveIndex(prev => Math.max(prev - 1, 0));
      } else {
        e.preventDefault();
        if (activeRowIndex > 0) {
          setActiveRowIndex(activeRowIndex - 1);
          setSearchQuery(items[activeRowIndex - 1].name || "");
        }
      }
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (searchQuery && filteredStock.length > 0) {
        const selected = filteredStock[listActiveIndex];
        const newItems = [...items];
        newItems[activeRowIndex] = { ...newItems[activeRowIndex], name: selected.productName, partNo: selected.partNo };
        setItems(newItems);
        setActiveCol('qty');
      } else if (items[activeRowIndex].name) {
        // If already has a name, just move to qty
        setActiveCol('qty');
      } else {
        // Name is completely blank - Do nothing! (User requested)
        return;
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (activeRowIndex > 0) {
        setActiveRowIndex(activeRowIndex - 1);
        setActiveCol('qty');
      } else {
        companyTriggerRef.current?.focus();
      }
    } else if (e.key === 'ArrowRight' && !e.shiftKey && items[activeRowIndex].name) {
      e.preventDefault();
      setActiveCol('qty');
    } else if (e.key === 'Backspace' && !searchQuery) {
      e.preventDefault();
      if (activeRowIndex > 0) {
        // If the row is completely empty, delete it when hitting backspace
        if (!items[activeRowIndex].name && !items[activeRowIndex].quantity) {
          const newItems = [...items];
          newItems.splice(activeRowIndex, 1);
          setItems(newItems);
        }
        setActiveRowIndex(activeRowIndex - 1);
        setActiveCol('qty');
      } else {
        companyTriggerRef.current?.focus();
      }
    } else if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      const newItems = [...items];
      if (newItems.length === 1) {
        newItems[0] = { name: "", quantity: "", partNo: "" };
        setItems(newItems);
        setSearchQuery("");
      } else {
        newItems.splice(activeRowIndex, 1);
        setItems(newItems);
        const nextIdx = Math.max(0, activeRowIndex - 1);
        setActiveRowIndex(nextIdx);
        setSearchQuery(newItems[nextIdx].name);
      }
      setActiveCol('name');
    }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (items[activeRowIndex].quantity) {
        if (activeRowIndex === items.length - 1) {
          setItems([...items, { name: "", quantity: "", partNo: "" }]);
          setSearchQuery("");
        } else {
          setSearchQuery(items[activeRowIndex + 1].name || "");
        }
        setActiveRowIndex(activeRowIndex + 1);
        setActiveCol('name');
        setListActiveIndex(0);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setActiveCol('name');
      setSearchQuery(items[activeRowIndex].name);
    } else if (e.key === 'ArrowLeft' && !e.shiftKey) {
      e.preventDefault();
      setActiveCol('name');
      setSearchQuery(items[activeRowIndex].name);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeRowIndex > 0) {
        setActiveRowIndex(activeRowIndex - 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeRowIndex < items.length - 1) {
        setActiveRowIndex(activeRowIndex + 1);
      }
    } else if (e.key === 'Backspace' && !items[activeRowIndex].quantity) {
      e.preventDefault();
      setActiveCol('name');
      setSearchQuery(items[activeRowIndex].name);
    } else if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      const newItems = [...items];
      if (newItems.length === 1) {
        newItems[0] = { name: "", quantity: "", partNo: "" };
        setItems(newItems);
        setSearchQuery("");
      } else {
        newItems.splice(activeRowIndex, 1);
        setItems(newItems);
        const nextIdx = Math.max(0, activeRowIndex - 1);
        setActiveRowIndex(nextIdx);
        setSearchQuery(newItems[nextIdx].name);
      }
      setActiveCol('name');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'var(--bg-base)',
      zIndex: 1000, display: 'flex', flexDirection: 'column'
    }}>

      {/* ── Full Screen Shell ── */}
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>

        {/* ── Modal Header ── */}
        <div style={{
          padding: '16px 24px',
          background: 'var(--gray-900)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{
              background: 'var(--primary-glow)', border: '1px solid var(--brand-300)',
              color: 'var(--brand-300)', padding: '4px 10px', borderRadius: 'var(--radius-xs)',
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
            }}>NEW VOUCHER</div>
            <span style={{fontWeight: 700, color: 'white', fontSize: '1rem'}}>Purchase Order</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <span style={{fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 500}}>
              {new Date().toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', year:'numeric'})}
            </span>
            <button
              onClick={handleCloseRequest}
              style={{
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-sm)', color: 'var(--gray-300)',
                width: '30px', height: '30px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', fontSize: '1rem',
              }}
            ><X size={20} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{display: 'flex', flex: 1, overflow: 'hidden'}}>

          {/* ── Left: Form ── */}
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)'}}>

            {/* Form Fields */}
            <div style={{padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)', flexShrink: 0}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>

                {/* Party Name */}
                <div style={{
                  flex: 1, minWidth: '250px',
                  background: focusedSection === 'party' ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                  border: focusedSection === 'party' ? '1px solid var(--brand-300)' : '1px solid transparent',
                  padding: '12px', margin: '-12px', borderRadius: '8px', transition: 'all 0.2s'
                }}>
                  <label style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px'}}>
                    <span>Party A/c Name</span>
                    <span style={{fontSize: '0.65rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0'}}>Alt+P</span>
                  </label>
                  <input
                    ref={partyInputRef}
                    list="suppliers-list"
                    type="text"
                    autoFocus
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!partyName.trim()) {
                          setSubmitError('Enter Party A/c Name first!');
                          setTimeout(() => setSubmitError(''), 3000);
                        } else {
                          companyTriggerRef.current?.focus();
                        }
                      }
                    }}
                    placeholder="Enter supplier / party name..."
                    style={{
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      outline: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      width: '100%',
                    }}
                    onFocus={e => { setFocusedSection('party'); e.target.style.borderColor = 'var(--brand-400)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <datalist id="suppliers-list">
                    {suppliers.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', position: 'relative',
                  opacity: partyName.trim() ? 1 : 0.5,
                  pointerEvents: partyName.trim() ? 'auto' : 'none',
                  background: focusedSection === 'company' ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                  border: focusedSection === 'company' ? '1px solid var(--brand-300)' : '1px solid transparent',
                  padding: '12px', margin: '-12px', borderRadius: '8px', transition: 'all 0.2s', flex: 1, minWidth: '300px'
                }} ref={companyDropdownRef}>
                  <label style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px'}}>
                    <span>Filter by Company</span>
                    <span style={{fontSize: '0.65rem', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0'}}>Alt+C</span>
                  </label>

                  {/* Trigger */}
                  <button
                    ref={companyTriggerRef}
                    type="button"
                    onKeyDown={handleCompanyKeyDown}
                    onClick={() => { 
                      const willOpen = !companyDropdownOpen;
                      setCompanyDropdownOpen(willOpen); 
                      setCompanyFocusIndex(0);
                      if (willOpen) setTimeout(() => companySearchInputRef.current?.focus(), 0);
                    }}
                    style={{
                      width: '100%', minHeight: '42px',
                      padding: '6px 36px 6px 10px',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      textAlign: 'left', cursor: 'pointer',
                      display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center',
                      position: 'relative',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      outline: 'none',
                    }}
                    onFocus={e => { setFocusedSection('company'); e.currentTarget.style.borderColor = 'var(--brand-400)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--primary-glow)'; }}
                    onBlur={e => { if (!companyDropdownRef.current?.contains(e.relatedTarget as Node)) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}}
                  >
                    {selectedCompanies.length === 0 ? (
                      <span style={{fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)'}}>All Companies</span>
                    ) : (
                      selectedCompanies.map(c => (
                        <span key={c} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: 'var(--brand-100)', color: 'var(--brand-700)',
                          borderRadius: '100px', padding: '2px 8px',
                          fontSize: '0.78rem', fontWeight: 700,
                        }}>
                          {c}
                          <span
                            onClick={e => { e.stopPropagation(); toggleCompany(c); }}
                            style={{cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem', lineHeight: 1, opacity: 0.7}}
                          >×</span>
                        </span>
                      ))
                    )}
                    <span style={{
                      position: 'absolute', right: '10px', top: '50%', transform: `translateY(-50%) rotate(${companyDropdownOpen ? 180 : 0}deg)`,
                      transition: 'transform 0.2s', pointerEvents: 'none',
                      color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                    }}><ChevronDown size={14} /></span>
                  </button>

                  {/* Dropdown */}
                  {companyDropdownOpen && (
                    <div
                      onKeyDown={handleCompanyKeyDown}
                      tabIndex={-1}
                      style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                        zIndex: 200, overflow: 'hidden',
                        maxHeight: '240px', overflowY: 'auto',
                      }}
                    >
                      {/* Search Input */}
                      <div style={{padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)', position: 'sticky', top: 0, zIndex: 10}}>
                        <input
                          ref={companySearchInputRef}
                          onFocus={(e) => {
                            setFocusedSection('company');
                            e.target.style.borderColor = 'var(--brand-400)';
                          }}
                          type="text"
                          value={companySearchStr}
                          onChange={e => {
                            setCompanySearchStr(e.target.value);
                            setCompanyFocusIndex(0); // reset focus when typing
                          }}
                          placeholder="Search companies..."
                          style={{
                            width: '100%', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)', background: 'var(--bg-surface)',
                            outline: 'none', fontSize: '0.85rem', color: 'var(--text-main)',
                          }}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                      </div>

                      {/* All option */}
                      {!companySearchStr && (
                        <div
                          ref={companyFocusIndex === 0 ? activeCompanyItemRef : null}
                          onClick={() => { setSelectedCompanies([]); setListActiveIndex(0); setCompanyDropdownOpen(false); setCompanySearchStr(''); }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                            background: companyFocusIndex === 0 ? 'var(--brand-50)' : 'transparent',
                            borderBottom: '1px solid var(--border)',
                          }}
                          onMouseEnter={() => setCompanyFocusIndex(0)}
                        >
                          <div style={{
                            width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                            border: `2px solid ${selectedCompanies.length === 0 ? 'var(--primary)' : 'var(--border)'}`,
                            background: selectedCompanies.length === 0 ? 'var(--primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selectedCompanies.length === 0 && <span style={{color: 'white', fontSize: '0.6rem', fontWeight: 900}}>✔</span>}
                          </div>
                          <span style={{fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)'}}>All Companies</span>
                        </div>
                      )}

                      {/* Company options */}
                      {filteredUniqueGroups.length === 0 ? (
                        <div style={{padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No companies found.</div>
                      ) : (
                        filteredUniqueGroups.map((g, idx) => {
                          const isChecked = selectedCompanies.includes(g);
                          // If search is active, the first actual item is index 0 (if we hide "All") or we just keep focus index mapping
                          const actualFocusIdx = companySearchStr ? idx : idx + 1;
                          const isFocused = companyFocusIndex === actualFocusIdx;
                          return (
                            <div
                              key={g}
                              ref={isFocused ? activeCompanyItemRef : null}
                              onClick={() => {
                                toggleCompany(g);
                                companySearchInputRef.current?.focus();
                              }}
                              style={{
                                padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                background: isFocused ? 'var(--brand-50)' : 'transparent',
                                borderBottom: idx < filteredUniqueGroups.length - 1 ? '1px solid var(--border)' : 'none',
                              }}
                              onMouseEnter={() => setCompanyFocusIndex(actualFocusIdx)}
                            >
                              <div style={{
                                width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                                border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
                                background: isChecked ? 'var(--primary)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}>
                                {isChecked && <span style={{color: 'white', fontSize: '0.6rem', fontWeight: 900}}>✔</span>}
                              </div>
                              <span style={{fontWeight: isChecked ? 700 : 500, fontSize: '0.9rem', color: isChecked ? 'var(--primary)' : 'var(--text-main)'}}>{g}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              opacity: partyName.trim() ? 1 : 0.5,
              pointerEvents: partyName.trim() ? 'auto' : 'none',
              border: focusedSection === 'grid' ? '2px solid var(--brand-300)' : '2px solid transparent',
              transition: 'all 0.2s', margin: '-2px'
            }}>
              <div style={{
                display: 'flex', background: 'var(--gray-50)',
                borderBottom: '1px solid var(--border)',
                fontWeight: 700, color: 'var(--text-muted)',
                fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                flexShrink: 0,
              }}>
                <div style={{width: '52px', padding: '12px', borderRight: '1px solid var(--border)', textAlign: 'center'}}>#</div>
                <div style={{flex: 1, padding: '12px', borderRight: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span>Name of Item</span>
                  <span style={{fontSize: '0.65rem', background: 'var(--gray-200)', color: 'var(--gray-600)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0'}}>Shift+←</span>
                </div>
                <div style={{width: '220px', padding: '12px', borderRight: '1px solid var(--border)'}}>Part No.</div>
                <div style={{width: '130px', padding: '12px', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontSize: '0.65rem', background: 'var(--gray-200)', color: 'var(--gray-600)', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0'}}>Alt+Q</span>
                  <span>Quantity</span>
                </div>
              </div>

              <div style={{flex: 1, overflowY: 'auto'}}>
                {items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex', borderBottom: '1px solid var(--border)',
                      background: index === activeRowIndex ? 'var(--brand-50)' : 'var(--bg-surface)',
                      minHeight: '46px', transition: 'background 0.15s',
                    }}
                  >
                    <div 
                      style={{
                        width: '52px', padding: '10px 12px', borderRight: '1px solid var(--border)',
                        textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.85rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onClick={() => { setActiveRowIndex(index); setActiveCol('name'); setSearchQuery(item.name || ""); }}
                    >
                      {index + 1}
                    </div>

                    <div 
                      style={{flex: 1, padding: '10px 14px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', cursor: 'text'}}
                      onClick={() => { setActiveRowIndex(index); setActiveCol('name'); setSearchQuery(item.name || ""); }}
                    >
                      {index === activeRowIndex && activeCol === 'name' ? (
                        <input
                          ref={nameInputRef}
                          onFocus={() => setFocusedSection('grid')}
                          type="text"
                          value={searchQuery}
                          onChange={e => { setSearchQuery(e.target.value); setListActiveIndex(0); }}
                          onKeyDown={handleNameKeyDown}
                          style={{
                            width: '100%', border: 'none', outline: 'none',
                            background: 'transparent', fontWeight: 600,
                            fontSize: '0.9rem', color: 'var(--text-main)',
                          }}
                          placeholder="Type to search product..."
                        />
                      ) : (
                        <span style={{fontWeight: 600, fontSize: '0.9rem', color: item.name ? 'var(--text-main)' : 'var(--text-faint)'}}>
                          {item.name || '—'}
                        </span>
                      )}
                    </div>

                    <div style={{
                      width: '220px', padding: '10px 14px', borderRight: '1px solid var(--border)',
                      color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.85rem',
                      display: 'flex', alignItems: 'center',
                    }}>{item.partNo || ''}</div>

                    <div 
                      style={{
                        width: '130px', padding: '10px 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'text'
                      }}
                      onClick={() => { setActiveRowIndex(index); setActiveCol('qty'); }}
                    >
                      {index === activeRowIndex && activeCol === 'qty' ? (
                        <input
                          ref={qtyInputRef}
                          onFocus={() => setFocusedSection('grid')}
                          type="text"
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const newItems = [...items];
                            newItems[index].quantity = val;
                            setItems(newItems);
                          }}
                          onKeyDown={handleQtyKeyDown}
                          style={{
                            width: '100%', border: 'none', outline: 'none',
                            background: 'transparent', textAlign: 'center',
                            fontWeight: 800, fontSize: '1rem', color: 'var(--primary)',
                          }}
                          placeholder="0"
                        />
                      ) : (
                        <span style={{fontWeight: 800, fontSize: '1rem', color: item.quantity ? 'var(--primary)' : 'var(--text-faint)'}}>
                          {item.quantity || '—'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{
                padding: '14px 24px', borderTop: '1px solid var(--border)',
                background: 'var(--bg-base)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
              }}>
                <span style={{fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500}}>
                  {items.filter(i => i.name && i.quantity).length} item(s) ready
                </span>
                <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                  {submitError && (
                    <span style={{color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, background: '#fef2f2', padding: '6px 12px', borderRadius: '4px'}}>
                      {submitError}
                    </span>
                  )}
                  <button
                    ref={submitBtnRef}
                    onClick={() => {
                      const finalItems = items.filter(i => i.name && i.quantity);
                      if (!partyName.trim()) {
                        setSubmitError('Enter Party A/c Name');
                        partyInputRef.current?.focus();
                        setTimeout(() => setSubmitError(''), 3000);
                        return;
                      }
                      if (finalItems.length === 0) {
                        setSubmitError('Enter at least 1 item');
                        nameInputRef.current?.focus();
                        setTimeout(() => setSubmitError(''), 3000);
                        return;
                      }
                      onSubmit({ companyName: partyName, urgency: 'Normal', items: finalItems });
                    }}
                    className="action-btn btn-primary"
                    style={{padding: '10px 32px'}}
                  >
                    Submit Order ↵
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            width: '320px', display: 'flex', flexDirection: 'column', flexShrink: 0,
            background: focusedSection === 'stock' ? 'var(--brand-50)' : 'var(--bg-base)',
            opacity: partyName.trim() ? 1 : 0.5,
            pointerEvents: partyName.trim() ? 'auto' : 'none',
            borderLeft: focusedSection === 'stock' ? '3px solid var(--brand-500)' : '1px solid var(--border)',
            boxShadow: focusedSection === 'stock' ? '-5px 0 20px rgba(99,102,241,0.1)' : 'none',
            transition: 'all 0.2s', zIndex: 10
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)', flexShrink: 0,
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em'}}>
                  Stock Items
                </div>
                <span style={{fontSize: '0.65rem', background: 'var(--gray-100)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700}}>Shift+→</span>
              </div>
              {selectedCompanies.length > 0 && (
                <div style={{marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                  {selectedCompanies.map(c => (
                    <span key={c} style={{fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--brand-50)', padding: '1px 6px', borderRadius: '100px'}}>{c}</span>
                  ))}
                </div>
              )}
            </div>
            <div 
              ref={stockPanelRef}
              tabIndex={0}
              onFocus={() => setFocusedSection('stock')}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setListActiveIndex(prev => Math.min(prev + 1, filteredStock.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setListActiveIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredStock.length > 0) {
                    const selected = filteredStock[listActiveIndex];
                    const newItems = [...items];
                    newItems[activeRowIndex] = { ...newItems[activeRowIndex], name: selected.productName, partNo: selected.partNo };
                    setItems(newItems);
                    setActiveCol('qty');
                  }
                }
              }}
              style={{flex: 1, overflowY: 'auto', outline: 'none'}}
            >
              {activeCol === 'name' ? (
                filteredStock.length === 0 ? (
                  <div style={{padding: '32px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.875rem'}}>
                    No items found
                  </div>
                ) : (
                  filteredStock.map((stock, i) => (
                    <div
                      key={i}
                      ref={i === listActiveIndex ? activeListItemRef : null}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)',
                        background: i === listActiveIndex ? 'var(--brand-50)' : 'var(--bg-surface)',
                        borderLeft: i === listActiveIndex ? '3px solid var(--primary)' : '3px solid transparent',
                        cursor: 'default', transition: 'background 0.1s',
                      }}
                    >
                      <div style={{
                        fontWeight: i === listActiveIndex ? 700 : 500,
                        fontSize: '0.875rem',
                        color: i === listActiveIndex ? 'var(--primary)' : 'var(--text-main)',
                        marginBottom: '2px',
                      }}>{stock.productName}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: i === listActiveIndex ? 'var(--brand-400)' : 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}>{stock.partNo !== 'N/A' ? stock.partNo : ''}</div>
                    </div>
                  ))
                )
              ) : (
                <div style={{padding: '32px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: '0.875rem'}}>
                  Select an item row to browse stock.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quit Confirm Overlay */}
      {showQuitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '40px 48px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            boxShadow: 'var(--shadow-xl)', maxWidth: '380px', width: '100%', textAlign: 'center',
          }}>
            <div style={{marginBottom: '12px'}}><AlertTriangle size={48} color="var(--danger)" /></div>
            <div style={{fontWeight: 800, color: 'var(--text-main)', fontSize: '1.25rem', letterSpacing: '-0.02em'}}>Discard Changes?</div>
            <div style={{fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px'}}>Any unsaved progress will be lost.</div>
            <div style={{display: 'flex', gap: '12px', width: '100%'}}>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="action-btn btn-secondary"
                style={{flex: 1}}
              >
                Cancel <span style={{opacity: 0.5, fontSize: '0.8rem'}}>Esc</span>
              </button>
              <button
                onClick={onClose}
                className="action-btn btn-danger"
                style={{flex: 1, background: 'var(--danger)', color: 'white', border: 'none'}}
              >
                Discard <span style={{opacity: 0.7, fontSize: '0.8rem'}}>Enter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<CompanyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CompanyOrder | null>(null);

  // Inventory & Supplier Sync State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Formal Viewer State
  const [viewingOrder, setViewingOrder] = useState<CompanyOrder | null>(null);
  const [showPartNo, setShowPartNo] = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, 'companyOrders'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr = Object.entries(data).map(([key, val]: any) => ({
          id: key,
          ...val
        }));
        // Sort newest first
        arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setOrders(arr);
      } else {
        setOrders([]);
      }
      setLoading(false);
    });

    const unsubInv = onValue(ref(db, 'productLedger/groups'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const invItems: InventoryItem[] = [];
        const groupsArray = Array.isArray(data) ? data : Object.values(data);
        
        groupsArray.forEach((groupVal: any) => {
          if (groupVal && groupVal.products) {
            const productsList = Array.isArray(groupVal.products) ? groupVal.products : Object.values(groupVal.products);
            productsList.forEach((itemVal: any) => {
              if (itemVal && (itemVal.partNumber || itemVal.productName || itemVal.name)) {
                invItems.push({
                  partNo: itemVal.partNumber || 'N/A',
                  productName: itemVal.productName || itemVal.name || 'Unnamed Product',
                  groupName: groupVal.groupName || 'Unknown Group'
                });
              }
            });
          }
        });
        setInventory(invItems);
      }
    });

    const unsubSuppliers = onValue(ref(db, 'suppliers'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSuppliers(Object.entries(data).map(([key, val]: any) => ({ id: key, ...val })));
      } else {
        setSuppliers([]);
      }
    });

    return () => {
      unsub();
      unsubInv();
      unsubSuppliers();
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingOrder(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const generatePDF = async (shareWhatsApp = false) => {
    if (!viewingOrder) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add Logo at top left
      try {
        const logoImg = new window.Image();
        logoImg.src = '/black-logo.png';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });
        const imgWidth = 35;
        const imgHeight = (logoImg.naturalHeight * imgWidth) / logoImg.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = logoImg.naturalWidth;
        canvas.height = logoImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(logoImg, 0, 0);
          const base64data = canvas.toDataURL('image/png');
          pdf.addImage(base64data, 'PNG', 14, 15, imgWidth, imgHeight);
        }
      } catch (e) {
        console.error("Logo failed to load for PDF", e);
      }

      // Title & Order Info (Right aligned)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42);
      pdf.text("PURCHASE ORDER", 196, 22, { align: 'right' });
      
      pdf.setFontSize(14);
      pdf.text(viewingOrder.companyName, 196, 30, { align: 'right' });

      const orderDate = new Date(viewingOrder.timestamp).toLocaleDateString('en-GB');
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`DATE: `, 160, 38, { align: 'right' });
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.text(orderDate, 196, 38, { align: 'right' });

      // Separator Line
      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(1);
      pdf.line(14, 46, 196, 46);

      // Table Data
      const tableColumn = ["Sl No", "Item Description"];
      if (showPartNo) tableColumn.push("Part No");
      tableColumn.push("Quantity");
      
      const tableRows: any[] = [];
      
      viewingOrder.items?.forEach((item, index) => {
        const rowData = [
          index + 1,
          item.name,
        ];
        if (showPartNo) {
          rowData.push(item.partNo && item.partNo !== 'N/A' ? item.partNo : '-');
        }
        rowData.push(item.quantity);
        tableRows.push(rowData);
      });
      
      // Generate Table
      autoTable(pdf, {
        head: [tableColumn],
        body: tableRows,
        startY: 54,
        margin: { top: 54, left: 14, right: 14, bottom: 35 },
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9, cellPadding: 3, halign: 'center' },
        styles: { fontSize: 9, cellPadding: 3, minCellHeight: 6, lineColor: [203, 213, 225], lineWidth: 0.2, textColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          ...(!showPartNo ? { 2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' } } : { 2: { cellWidth: 40, font: 'courier', halign: 'center' }, 3: { cellWidth: 30, halign: 'center', fontStyle: 'bold' } })
        }
      });

      const finalY = (pdf as any).lastAutoTable.finalY || 75;
      
      pdf.save(`PO-${viewingOrder.companyName.replace(/[^a-z0-9]/gi, '_')}.pdf`);

      if (shareWhatsApp) {
        const orderDate = new Date(viewingOrder.timestamp).toLocaleDateString('en-GB');
        let text = `*New Purchase Order*\n`;
        text += `*Supplier:* ${viewingOrder.companyName}\n`;
        text += `*Date:* ${orderDate}\n`;
        text += `*Urgency:* ${viewingOrder.urgency}\n\n`;
        text += `*Items:*\n`;
        viewingOrder.items?.forEach((item, index) => {
          text += `${index + 1}. ${item.name} (Qty: ${item.quantity})\n`;
        });
        text += `\n_Please find the attached PDF for full details._`;

        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
      }
    } catch (err) {
      alert("Failed to generate PDF");
      console.error(err);
    }
  };

  const handleSubmitOrder = (orderData: any) => {
    if (editingOrder) {
      update(ref(db, `companyOrders/${editingOrder.id}`), {
        ...orderData,
        timestamp: new Date().toISOString()
      }).then(() => {
        setEditingOrder(null);
        setViewingOrder(null);
      }).catch(err => alert("Failed to update order: " + err.message));
    } else {
      push(ref(db, 'companyOrders'), {
        ...orderData,
        status: 'Pending',
        timestamp: new Date().toISOString()
      }).then(() => {
        setShowNewOrder(false);
      }).catch(err => alert("Failed to create order: " + err.message));
    }
  };

  const updateStatus = (id: string, newStatus: string) => {
    update(ref(db, `companyOrders/${id}`), { status: newStatus }).catch(err => alert("Error: " + err.message));
  };

  const deleteOrder = (id: string) => {
    if (confirm("Permanently delete this order?")) {
      remove(ref(db, `companyOrders/${id}`));
    }
  };

  const getUrgencyColor = (urg: string) => {
    if (urg === 'Critical') return 'var(--danger)';
    if (urg === 'Urgent') return 'var(--warning)';
    return 'var(--success)';
  };

  const renderColumn = (status: 'Pending' | 'Sent' | 'Delivered', title: string, icon: string) => {
    const columnOrders = orders.filter(o => o.status === status);
    
    return (
      <div className="kanban-col" style={{flex: 1, minWidth: '320px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px'}}>
          <h3 style={{fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)'}}>{icon} {title}</h3>
          <span className="badge-outline" style={{background: 'rgba(255,255,255,0.05)'}}>{columnOrders.length}</span>
        </div>
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1}}>
          {columnOrders.length === 0 && (
            <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '0.9rem'}}>No orders here</div>
          )}
          {columnOrders.map(order => (
            <div key={order.id} className="kanban-card" style={{background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', position: 'relative'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span style={{fontWeight: 700, fontSize: '1.15rem', color: 'white'}}>{order.companyName}</span>
                <div style={{display: 'flex', gap: '8px'}}>
                  {order.urgency === 'Urgent' && <span className="badge badge-warning">Urgent</span>}
                  {order.urgency === 'Critical' && <span className="badge badge-danger">Critical</span>}
                </div>
              </div>
              
              <div style={{background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div>
                  <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px'}}>Order Items</div>
                  <div style={{fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)'}}>{order.items?.length || 0}</div>
                </div>
                <button className="action-btn btn-ghost" style={{padding: '8px 16px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.1)', display: 'inline-flex', alignItems: 'center', gap: '6px'}} onClick={() => setViewingOrder(order)}>View Details <ArrowRight size={14} /></button>
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px'}}>
                <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                  {new Date(order.timestamp).toLocaleDateString()}
                </span>
                <div style={{display: 'flex', gap: '8px'}}>
                  {status === 'Pending' && <button className="action-btn" style={{padding: '4px 12px', fontSize: '0.75rem', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '4px'}} onClick={() => updateStatus(order.id, 'Sent')}>Mark Sent <ArrowRight size={14} /></button>}
                  {status === 'Sent' && <button className="action-btn" style={{padding: '4px 12px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: '4px'}} onClick={() => updateStatus(order.id, 'Delivered')}>Mark Delivered <Check size={14} /></button>}
                  {status === 'Delivered' && <button className="action-btn" style={{padding: '4px 12px', fontSize: '0.75rem', background: 'transparent', color: 'var(--text-muted)'}} onClick={() => deleteOrder(order.id)}>Archive</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
              <span className="breadcrumb-current">Supplier Orders</span>
            </div>
          </div>
          <div style={{flex: 1}} />
          <div className="top-bar-right">
            <div className="top-bar-date">{new Date().toLocaleDateString('en-GB')}</div>
            <div className="user-profile"><div className="avatar">A</div></div>
          </div>
        </div>

        <div className="page-content" style={{height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column'}}>
          <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px'}}>
            <div>
              <h1 className="heading-1">List of Orders (Day Book)</h1>
              <p className="text-muted">Master list of all Purchase Orders.</p>
            </div>
            <button className="action-btn btn-primary" onClick={() => setShowNewOrder(true)}>
              + New Order (PO)
            </button>
          </header>

          {/* List of Vouchers (Day Book) */}
          <div className="table-container" style={{flex: 1, overflowY: 'auto'}}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th style={{width: '120px'}}>Date</th>
                  <th>Particulars (Party A/c Name)</th>
                  <th style={{width: '150px'}}>Vch Type</th>
                  <th style={{width: '150px', textAlign: 'center'}}>Total Items</th>
                  <th style={{width: '150px', textAlign: 'center'}}>Status</th>
                  <th style={{width: '120px', textAlign: 'right'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>No orders found.</td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="ledger-row" style={{cursor: 'pointer'}} onClick={() => setViewingOrder(order)}>
                      <td style={{fontWeight: 500}}>{new Date(order.timestamp).toLocaleDateString('en-GB')}</td>
                      <td style={{fontWeight: 700, color: 'var(--primary)'}}>{order.companyName}</td>
                      <td style={{color: 'var(--text-muted)'}}>Purc Order</td>
                      <td style={{textAlign: 'center', fontWeight: 600}}>{order.items?.length || 0} Nos</td>
                      <td style={{textAlign: 'center'}}>
                        <span className={`badge-outline badge-${order.status === 'Pending' ? 'warning' : order.status === 'Sent' ? 'primary' : 'success'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{textAlign: 'right'}} onClick={e => e.stopPropagation()}>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px'}}>
                          <select 
                            className="inline-input" 
                            style={{padding: '4px 8px', fontSize: '0.8rem', width: 'auto', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '4px'}} 
                            value={order.status}
                            onChange={e => updateStatus(order.id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Sent">Sent</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                          <button 
                            className="action-btn"
                            style={{background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px'}}
                            onClick={(e) => { e.stopPropagation(); setEditingOrder(order); }}
                            title="Edit Order"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="action-btn"
                            style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px'}}
                            onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                            title="Delete Order"
                          >
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
      </main>

      {/* Tally Style Full Screen New/Edit Order Form */}
      {(showNewOrder || editingOrder) && (
        <TallyOrderForm 
          onClose={() => { setShowNewOrder(false); setEditingOrder(null); }} 
          inventory={inventory} 
          suppliers={suppliers}
          onSubmit={handleSubmitOrder} 
          initialOrder={editingOrder}
        />
      )}

      {/* Formal Purchase Order Viewer Modal */}
      {/* Formal Purchase Order Viewer Full Page */}
      {viewingOrder && (
        <div style={{position: 'fixed', inset: 0, background: 'var(--bg-base)', zIndex: 9999, display: 'flex', flexDirection: 'column'}}>
          
          {/* Top Navbar */}
          <div style={{padding: '16px 32px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
              <button className="action-btn btn-ghost" onClick={() => setViewingOrder(null)} style={{padding: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <X size={24} />
              </button>
              <div>
                <h2 style={{margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em'}}>Order Preview</h2>
              </div>
              <div style={{display: 'flex', alignItems: 'center', marginLeft: '24px', paddingLeft: '24px', borderLeft: '1px solid var(--border)'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600}}>
                  <input type="checkbox" checked={showPartNo} onChange={e => setShowPartNo(e.target.checked)} style={{width: '18px', height: '18px', cursor: 'pointer'}} />
                  Include Part Number in PDF
                </label>
              </div>
            </div>

            <div style={{display: 'flex', gap: '16px'}}>
              <button className="action-btn" style={{padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px'}} onClick={() => { setEditingOrder(viewingOrder); setViewingOrder(null); }}>
                Edit Order
              </button>
              <button className="action-btn" style={{padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px'}} onClick={() => { deleteOrder(viewingOrder.id); setViewingOrder(null); }}>
                Delete
              </button>
              <button className="action-btn" style={{padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'}} onClick={() => generatePDF(false)}>
                <Download size={18} />
                Download PDF
              </button>
              <button className="action-btn" style={{padding: '10px 24px', fontSize: '0.95rem', fontWeight: 600, background: '#25D366', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.2)'}} onClick={() => generatePDF(true)}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.201.535 1.291.043.089.072.193.014.308-.058.116-.087.188-.173.289l-.26.308c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.666.592 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.418-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 1.856.001 3.598.723 4.907 2.034 1.31 1.311 2.031 3.054 2.03 4.908-.001 3.825-3.113 6.938-6.937 6.938z"/>
                </svg>
                Share to WhatsApp
              </button>
            </div>
          </div>

          {/* Document Preview Area */}
          <div style={{flex: 1, overflowY: 'auto', padding: '40px 20px', display: 'flex', justifyContent: 'center', background: 'radial-gradient(circle at center, var(--bg-surface) 0%, var(--bg-base) 100%)'}}>
            <div id="purchase-order-pdf-content" style={{
              background: '#ffffff', 
              color: '#000000',
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              width: '100%', 
              maxWidth: '850px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: '1100px',
              height: 'max-content',
              padding: '48px'
            }}>
              
              {/* Premium Document Header */}
              <div style={{paddingBottom: '32px', borderBottom: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <img src="/black-logo.png" alt="SHM Logo" style={{height: '70px', width: 'auto', objectFit: 'contain'}} />
                </div>

                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '8px'}}>PURCHASE ORDER</div>
                  <div style={{fontWeight: 800, fontSize: '1.4rem', color: '#0f172a', marginBottom: '12px'}}>{viewingOrder.companyName}</div>
                  <div style={{fontSize: '0.95rem', color: '#64748b', fontWeight: 600, display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                    <span>DATE:</span> <span style={{color: '#0f172a'}}>{new Date(viewingOrder.timestamp).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>

              {/* Item Table */}
              <div style={{flex: 1, overflow: 'visible'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '16px'}}>
                  <thead>
                    <tr>
                      <th style={{padding: '6px', textAlign: 'center', fontSize: '0.85rem', color: '#ffffff', backgroundColor: '#475569', border: '1px solid #cbd5e1', width: '40px'}}>Sl No</th>
                      <th style={{padding: '6px', textAlign: 'left', fontSize: '0.85rem', color: '#ffffff', backgroundColor: '#475569', border: '1px solid #cbd5e1'}}>Item Description</th>
                      {showPartNo && <th style={{padding: '6px', textAlign: 'center', fontSize: '0.85rem', color: '#ffffff', backgroundColor: '#475569', border: '1px solid #cbd5e1', width: '150px'}}>Part No</th>}
                      <th style={{padding: '6px', textAlign: 'center', fontSize: '0.85rem', color: '#ffffff', backgroundColor: '#475569', border: '1px solid #cbd5e1', width: '80px'}}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td style={{padding: '6px', fontSize: '0.9rem', color: '#334155', border: '1px solid #cbd5e1', textAlign: 'center'}}>{index + 1}</td>
                        <td style={{padding: '6px', fontSize: '0.95rem', color: '#0f172a', border: '1px solid #cbd5e1'}}>{item.name}</td>
                        {showPartNo && <td style={{padding: '6px', fontSize: '0.9rem', color: '#475569', fontFamily: 'monospace', border: '1px solid #cbd5e1', textAlign: 'center'}}>{item.partNo && item.partNo !== 'N/A' ? item.partNo : '-'}</td>}
                        <td style={{padding: '6px', fontSize: '1rem', color: '#0f172a', fontWeight: 700, textAlign: 'center', border: '1px solid #cbd5e1'}}>{item.quantity}</td>
                      </tr>
                    ))}
                    {(!viewingOrder.items || viewingOrder.items.length === 0) && (
                      <tr>
                        <td colSpan={showPartNo ? 4 : 3} style={{textAlign: 'center', padding: '24px', color: '#94a3b8', border: '1px solid #cbd5e1'}}>No items in this order.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
