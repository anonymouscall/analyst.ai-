import React from 'react';
import { Link } from 'react-router-dom';

const FooterNav: React.FC = () => {
  return (
    <footer className="footer-nav container">
      <div className="footer-content">
        <span>© 2026 ANALYST.AI. Engineered with zero-egress data standards.</span>
        <div className="footer-links">
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Core</Link>
          <Link to="/cookies">Cookies Settings</Link>
          <Link to="/contact">Support Center</Link>
        </div>
      </div>
    </footer>
  );
};

export default FooterNav;