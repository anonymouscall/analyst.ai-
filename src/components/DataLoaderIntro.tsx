import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Database, Terminal, Shield } from 'lucide-react';

const INTRO_LOGS = [
  'Initializing enterprise orchestrator context...',
  'Scanning database schema embeddings...',
  'Discovering list_tables & describe_table tools...',
  'Verifying SQL query validation rules...',
  'Spawning secure stdio MCP subprocess...',
  'Secure protocol connection established.'
];

const DataLoaderIntro: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [activeLogIdx, setActiveLogIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const progressSmoothRef = useRef(0);

  useEffect(() => {
    // Skip if played in current browser session
    const hasPlayed = sessionStorage.getItem('intro-played') === 'true';
    if (hasPlayed) {
      setVisible(false);
      return;
    }

    const totalLogs = INTRO_LOGS.length;
    const logIntervalTime = 200; // ms per log entry (total logs duration ~1.2s)

    // Run active log indexing
    const logTimer = setInterval(() => {
      setActiveLogIdx(prev => {
        if (prev < totalLogs - 1) {
          return prev + 1;
        }
        clearInterval(logTimer);
        return prev;
      });
    }, logIntervalTime);

    // Smoothly increment progress to 100% over the duration (50 * 24ms = 1200ms = 1.2s)
    const progressTimer = setInterval(() => {
      progressSmoothRef.current += 2;
      if (progressSmoothRef.current >= 100) {
        progressSmoothRef.current = 100;
        clearInterval(progressTimer);
      }
      setProgress(progressSmoothRef.current);
    }, 24);

    return () => {
      clearInterval(logTimer);
      clearInterval(progressTimer);
    };
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // Exit animations using GSAP
      const tl = gsap.timeline({
        onComplete: () => {
          setVisible(false);
          sessionStorage.setItem('intro-played', 'true');
          window.dispatchEvent(new Event('intro-complete'));
        }
      });

      tl.to('.intro-text-line', { opacity: 0, y: -10, duration: 0.3, stagger: 0.04 });
      tl.to('.intro-spinner-wrapper', { scale: 0.8, opacity: 0, duration: 0.4, ease: 'power2.in' }, '-=0.2');
      tl.to(containerRef.current, { 
        yPercent: -100, 
        opacity: 0, 
        duration: 0.6, 
        ease: 'power3.inOut' 
      }, '-=0.1');
    }
  }, [progress]);

  if (!visible) return null;

  return (
    <div 
      ref={containerRef} 
      className="intro-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        padding: '24px',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      {/* 3D Grid & Scanning Effects */}
      <div className="intro-grid-background" />
      <div className="intro-scanline" />

      <div 
        className="intro-spinner-wrapper" 
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '120px',
          height: '120px'
        }}
      >
        <div 
          className="intro-pulse-radar"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px solid var(--primary)',
            opacity: 0.15,
            animation: 'intro-pulse 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite'
          }}
        />
        <div 
          className="intro-spinner"
          style={{
            position: 'absolute',
            inset: '6px',
            borderRadius: '50%',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--text-heading)',
            animation: 'intro-spin 1.0s cubic-bezier(0.44, 0.21, 0.29, 0.86) infinite'
          }}
        />
        <Database size={28} style={{ color: 'var(--text-heading)', opacity: 0.9, zIndex: 2 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
        <span 
          style={{ 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            fontFamily: 'var(--font-mono)', 
            color: 'var(--text-heading)',
            letterSpacing: '-0.03em',
            lineHeight: 1
          }}
        >
          {progress}%
        </span>
        <span 
          style={{ 
            fontSize: '0.72rem', 
            fontFamily: 'var(--font-mono)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.18em', 
            color: 'var(--text)', 
            opacity: 0.6 
          }}
        >
          Analyzing Database Pipeline
        </span>
      </div>

      <div 
        className="intro-logs-console"
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '136px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(10px)',
          padding: '20px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--text)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      >
        {INTRO_LOGS.slice(0, activeLogIdx + 1).map((log, idx) => (
          <div 
            key={idx} 
            className="intro-text-line"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              animation: 'intro-line-fade 0.2s forwards'
            }}
          >
            {idx === activeLogIdx ? (
              <Terminal size={11} style={{ color: 'var(--text-heading)' }} />
            ) : (
              <Shield size={11} style={{ color: 'var(--text)', opacity: 0.6 }} />
            )}
            <span style={{ color: idx === activeLogIdx ? 'var(--text-heading)' : 'var(--text)', opacity: idx === activeLogIdx ? 1 : 0.6 }}>
              {log}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .intro-grid-background {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.15;
          pointer-events: none;
          z-index: 1;
          animation: intro-grid-glow 4s ease-in-out infinite alternate;
        }
        .intro-scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--primary);
          opacity: 0.06;
          pointer-events: none;
          z-index: 3;
          animation: intro-scan 2.5s linear infinite;
        }
        @keyframes intro-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes intro-pulse {
          0% { transform: scale(0.85); opacity: 0.3; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes intro-grid-glow {
          0% { opacity: 0.08; }
          100% { opacity: 0.20; }
        }
        @keyframes intro-scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        @keyframes intro-line-fade {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DataLoaderIntro;
