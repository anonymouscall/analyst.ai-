import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', org: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to submit contact request.');
      } else {
        setSuccess(true);
        setForm({ name: '', email: '', org: '', message: '' });
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to support server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-container container animate-fade-in">
      <div className="section-header">
        <span className="section-label">[ Enterprise Support ]</span>
        <h2>Contact Integrations</h2>
        <p>Get in touch with our security core team to set up custom Model Context Protocol (MCP) bridges or enterprise database SLA agreements.</p>
      </div>
      <div className="contact-layout glass-panel">
        {success ? (
          <div className="contact-success animate-fade-in">
            <CheckCircle size={36} className="success-icon" />
            <h3>Message Transmitted</h3>
            <p>Your support ticket has been registered. An integration engineer will contact you shortly.</p>
            <button className="btn-secondary" onClick={() => setSuccess(false)}>Send Another Message</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Full Name <span className="req">*</span></label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Alex Carter"
                className="form-input"
                required
                disabled={loading}
              />
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="email">Corporate Email <span className="req">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="alex@company.com"
                  className="form-input"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="org">Organization</label>
                <input
                  type="text"
                  id="org"
                  name="org"
                  value={form.org}
                  onChange={handleChange}
                  placeholder="Acme Analytics"
                  className="form-input"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="message">Message Description <span className="req">*</span></label>
              <textarea
                id="message"
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="Provide details about your database cluster configuration..."
                className="form-input form-textarea"
                rows={5}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="contact-error animate-fade-in">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              <Send size={14} />
              <span>{loading ? 'Submitting...' : 'Send Message'}</span>
            </button>
          </form>
        )}
      </div>
      <style>{`
        .contact-layout {
          max-width: 680px;
          margin: 0 auto;
          padding: 40px;
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .form-group-row {
            grid-template-columns: 1fr;
          }
        }
        .req { color: oklch(65% 0.18 20); }
        .form-textarea { resize: vertical; }
        .contact-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          gap: 16px;
        }
        .success-icon { color: oklch(70% 0.15 140); }
        .contact-error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: oklch(65% 0.18 20);
          background: oklch(65% 0.18 20 / 0.1);
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid oklch(65% 0.18 20 / 0.2);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};

export default ContactPage;