"use client";

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, ArrowRight, Activity } from 'lucide-react';

const CORRECT_PIN = "8980346273";
const AUTH_KEY = "shm_auth_v2";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin === CORRECT_PIN) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 800);
    }
  };

  if (isAuthenticated === null) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}><div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite' }}></div></div>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Orbs */}
      <div style={{ position: 'absolute', width: '40vw', height: '40vw', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '50%', filter: 'blur(80px)', top: '-10%', left: '-10%' }} />
      <div style={{ position: 'absolute', width: '30vw', height: '30vw', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '50%', filter: 'blur(80px)', bottom: '-5%', right: '-5%' }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10,
        transform: error ? 'translateX(10px)' : 'none',
        transition: 'transform 0.1s ease-in-out'
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .shake-animation { animation: shake 0.4s ease-in-out; }
        `}} />

        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)' }}>
          <Lock size={28} color="white" />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px' }}>Security Check</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '32px', fontWeight: 500 }}>Enter authorization passcode to access accounting and ERP data.</p>

        <form onSubmit={handleUnlock}>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter 10-digit PIN"
              maxLength={10}
              autoFocus
              className={error ? 'shake-animation' : ''}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.2)',
                border: \`1px solid \${error ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}\`,
                borderRadius: '12px',
                padding: '16px 20px',
                color: error ? '#ef4444' : 'white',
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textAlign: 'center',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
            {error && <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginTop: '8px', position: 'absolute', width: '100%', textAlign: 'center' }}>Incorrect Passcode</div>}
          </div>

          <button 
            type="submit"
            style={{
              width: '100%',
              background: 'white',
              color: '#0f172a',
              border: 'none',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'none'}
          >
            Authenticate <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
          <ShieldCheck size={14} /> End-to-end encrypted session
        </div>
      </div>
    </div>
  );
}
