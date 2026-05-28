import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const CookieBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent-given')) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="cookie-banner-wrapper glass-panel animate-fade-in">
      <div className="cookie-banner-content">
        <Cookie size={20} className="logo-icon cookie-icon" />
        <div className="cookie-banner-text">
          <h5>Cookie Consent Compliance</h5>
          <p>
            We use cookies to maintain your query session, compile schema caching, and track latency metrics. By using this platform, you agree to our policies. Learn details in our{' '}
            <Link to="/cookies" onClick={() => setShow(false)} className="cookie-link">
              Cookie Settings
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="cookie-banner-actions">
        <button
          className="btn-secondary btn-sm"
          onClick={() => {
            localStorage.setItem('cookie-consent-given', 'declined');
            localStorage.setItem(
              'cookie-consent-settings',
              JSON.stringify({ essential: true, analytics: false, marketing: false })
            );
            setShow(false);
          }}
        >
          Decline
        </button>
        <button
          className="btn-primary btn-sm"
          onClick={() => {
            localStorage.setItem('cookie-consent-given', 'accepted');
            localStorage.setItem(
              'cookie-consent-settings',
              JSON.stringify({ essential: true, analytics: true, marketing: false })
            );
            setShow(false);
          }}
        >
          Accept All
        </button>
        <button className="cookie-close" onClick={() => setShow(false)}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;