import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import DataLoaderIntro from './components/DataLoaderIntro';
import Background3D from './components/Background3D';
import HeaderNav from './components/HeaderNav';
import FooterNav from './components/FooterNav';
import CookieBanner from './components/CookieBanner';
import Home from './pages/Home';
import DashboardPage from './pages/DashboardPage';
import SchemaPage from './pages/SchemaPage';
import HistoryPage from './pages/HistoryPage';
import DocsPage from './pages/DocsPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ContactPage from './pages/ContactPage';
import { CookiesPage, TermsPage, PrivacyPage } from './pages/CompliancePages';
import { QueryProvider } from './context/QueryContext';
import './index.css';

const App: React.FC = () => {
  const location = useLocation();
  const hideFooter = location.pathname === '/dashboard' || location.pathname === '/admin';

  return (
    <QueryProvider>
      <div className="app-container">
        <DataLoaderIntro />
        <Background3D />
        <div className="layout-border-left" />
        <div className="layout-border-right" />
        <HeaderNav />
        <main className="main-content-layout" style={{ flexGrow: 1, position: 'relative', zIndex: 10 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/schema" element={<SchemaPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </main>
        {!hideFooter && <FooterNav />}
        <CookieBanner />
      </div>
    </QueryProvider>
  );
};

export default App;