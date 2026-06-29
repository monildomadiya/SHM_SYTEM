"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Crown } from 'lucide-react';

const CORRECT_PIN = "8980346273";
const AUTH_KEY = "shm_auth_v2";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pinArray, setPinArray] = useState<string[]>(Array(10).fill(""));
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const verifyPin = (currentPin: string) => {
    if (currentPin.length === 10) {
      if (currentPin === CORRECT_PIN) {
        localStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
      } else {
        setError(true);
        setTimeout(() => {
          setError(false);
          setPinArray(Array(10).fill(""));
          inputRefs.current[0]?.focus();
        }, 600);
      }
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only numbers
    
    // Take only the last char if multiple are typed
    const val = value.slice(-1);
    
    const newPinArray = [...pinArray];
    newPinArray[index] = val;
    setPinArray(newPinArray);

    if (val !== "" && index < 9) {
      inputRefs.current[index + 1]?.focus();
    }

    verifyPin(newPinArray.join(""));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pinArray[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 10);
    if (!pastedData) return;

    const newPinArray = [...pinArray];
    for (let i = 0; i < pastedData.length; i++) {
      newPinArray[i] = pastedData[i];
    }
    setPinArray(newPinArray);
    
    const nextIndex = Math.min(pastedData.length, 9);
    inputRefs.current[nextIndex]?.focus();
    
    verifyPin(newPinArray.join(""));
  };

  if (isAuthenticated === null) {
    return <div style={{ height: '100vh', background: '#050505' }}></div>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: '#050505',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      color: 'white',
      position: 'relative',
    }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .shake-animation { animation: shake 0.3s ease-in-out; }
        
        .otp-input {
          width: 44px;
          height: 48px;
          background: #121212;
          border: 1px solid #262626;
          border-radius: 8px;
          color: white;
          font-size: 1.25rem;
          font-weight: 700;
          text-align: center;
          outline: none;
          transition: all 0.2s;
        }
        .otp-input:focus {
          border-color: #525252;
          background: #1a1a1a;
        }
        .otp-input.error {
          border-color: #991b1b;
          color: #ef4444;
        }
      `}} />

      <div className={error ? 'shake-animation' : ''} style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '24px',
        padding: '56px 48px',
        width: '100%',
        maxWidth: '460px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* Circular Logo Area */}
        <div style={{ 
          width: '110px', 
          height: '110px', 
          marginBottom: '32px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Faux circular text using an SVG */}
          <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', animation: 'spin 20s linear infinite' }}>
            <path id="circlePath" d="M 50, 50 m -35, 0 a 35,35 0 1,1 70,0 a 35,35 0 1,1 -70,0" fill="transparent" />
            <text fontSize="11" fontWeight="800" fill="#e5e5e5" letterSpacing="2px">
              <textPath href="#circlePath" startOffset="0%">PROMPT KING - PROMPT KING - </textPath>
            </text>
          </svg>
          
          <div style={{ zIndex: 2 }}>
            <Crown size={38} color="#ffffff" strokeWidth={1.5} />
          </div>
        </div>

        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px', color: '#ffffff' }}>
          Admin Portal
        </h1>
        <p style={{ color: '#737373', fontSize: '0.9rem', marginBottom: '40px', fontWeight: 500 }}>
          Authenticated Access Only
        </p>

        {/* OTP Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '12px',
          width: '100%'
        }}>
          {pinArray.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={\`otp-input \${error ? 'error' : ''}\`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
