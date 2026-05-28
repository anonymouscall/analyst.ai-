import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, Terminal, Sun, Moon, UploadCloud, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HeaderNav: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [globalUploading, setGlobalUploading] = useState(false);
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('admin-auth-token'));

  useEffect(() => {
    const handleStatusChange = () => {
      setIsLoggedIn(!!localStorage.getItem('admin-auth-token'));
    };
    window.addEventListener('db-status-changed', handleStatusChange);
    window.addEventListener('storage', handleStatusChange);
    return () => {
      window.removeEventListener('db-status-changed', handleStatusChange);
      window.removeEventListener('storage', handleStatusChange);
    };
  }, []);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleGlobalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'sqlite' && ext !== 'db' && ext !== 'json') {
      alert('Only .sqlite, .db, and .json files are supported.');
      return;
    }

    setGlobalUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) return;
      try {
        const token = localStorage.getItem('admin-auth-token') || 'mock-admin-token-jwt';
        const res = await fetch(`${API_BASE_URL}/api/admin/upload-db`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fileName: file.name, fileContent: base64 }),
        });
        const d = await res.json().catch(() => null);
        if (res.ok && d?.success) {
          window.dispatchEvent(new Event('db-status-changed'));
          alert('Database connected successfully!');
        } else {
          alert(d?.error || 'Failed to upload database.');
        }
      } catch (err: any) {
        alert(err.message || 'Error uploading database.');
      } finally {
        setGlobalUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const active = (path: string) => (location.pathname === path ? 'active' : '');

  return (
    <header className="header-nav">
      <div className="nav-container container">
        <Link to="/" className="nav-logo">
          <Database size={18} className="logo-icon" />
          <span>ANALYST.AI</span>
        </Link>
        <nav className="nav-menu">
          <Link to="/" className={`nav-menu-item ${active('/')}`}>Home</Link>
          <Link to="/dashboard" className={`nav-menu-item ${active('/dashboard')}`}>Dashboard</Link>
          <Link to="/schema" className={`nav-menu-item ${active('/schema')}`}>Schema Explorer</Link>
          <Link to="/history" className={`nav-menu-item ${active('/history')}`}>History</Link>
          <Link to="/docs" className={`nav-menu-item ${active('/docs')}`}>Docs</Link>
          <Link to="/contact" className={`nav-menu-item ${active('/contact')}`}>Contact</Link>
          {isLoggedIn ? (
            <Link to="/admin" className={`nav-menu-item admin-link ${active('/admin')}`}>Admin Console</Link>
          ) : (
            <Link to="/login" className={`nav-menu-item ${active('/login')}`}>Login</Link>
          )}
        </nav>
        <div className="nav-cta">
          <button 
            onClick={toggleTheme} 
            className="theme-toggle-btn"
            aria-label="Toggle dark/light mode"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.borderColor = 'var(--text-heading)';
              e.currentTarget.style.background = 'oklch(100% 0 0 / 0.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <label className="git-link" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'transparent', padding: '6px' }} title="Connect Database">
            {globalUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={18} />}
            <input type="file" accept=".sqlite,.db,.json" style={{ display: 'none' }} onChange={handleGlobalUpload} disabled={globalUploading} />
          </label>
          <Link to="/contact" className="btn-secondary">
            <Terminal size={14} />
            <span>Request Demo</span>
          </Link>
        </div>
        <button className="menu-toggle" onClick={() => setOpen(!open)}>
          <span className={`hamburger-bar ${open ? 'open' : ''}`} />
          <span className={`hamburger-bar ${open ? 'open' : ''}`} />
          <span className={`hamburger-bar ${open ? 'open' : ''}`} />
        </button>
      </div>
      <div className={`mobile-nav-panel ${open ? 'show' : ''}`}>
        <Link to="/" className="mobile-nav-item">Home</Link>
        <Link to="/dashboard" className="mobile-nav-item">Dashboard</Link>
        <Link to="/schema" className="mobile-nav-item">Schema Explorer</Link>
        <Link to="/history" className="mobile-nav-item">History</Link>
        <Link to="/docs" className="mobile-nav-item">Docs</Link>
        <Link to="/contact" className="mobile-nav-item">Contact</Link>
        {isLoggedIn ? (
          <Link to="/admin" className="mobile-nav-item">Admin Console</Link>
        ) : (
          <Link to="/login" className="mobile-nav-item">Login</Link>
        )}
      </div>
    </header>
  );
};

export default HeaderNav;