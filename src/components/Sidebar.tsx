"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ReceiptText, Coffee, X, Users } from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Stock Summary", path: "/stock", icon: Package },
  { name: "Supplier Orders", path: "/orders", icon: ReceiptText },
  { name: "Suppliers (Ledgers)", path: "/suppliers", icon: Users },
  { name: "Tea Tracker", path: "/tea-tracker", icon: Coffee },
];

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="brand">
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src="/black-logo.png" alt="SHM Logo" width={56} height={56} style={{ objectFit: 'contain' }} />
        </div>
        <div>
          <div className="brand-name">SHM-SYSTEM</div>
          <div className="brand-tagline">Enterprise ERP</div>
        </div>
        <button
          className="mobile-menu-btn"
          style={{
            position: "static",
            marginLeft: "auto",
            color: "var(--gray-500)",
            display: isOpen ? "block" : "none",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px"
          }}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-section-label">Navigation</div>

      <nav className="nav-links">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const IconComponent = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`nav-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-link-icon"><IconComponent size={18} strokeWidth={isActive ? 2.5 : 2} /></span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">SHM-SYSTEM v2.0</div>
      </div>
    </aside>
  );
}
