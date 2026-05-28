import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Database, Zap, Cpu, Network, Activity } from 'lucide-react';
import gsap from 'gsap';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('admin-auth-token') === 'mock-admin-token-jwt';

  useEffect(() => {
    const runAnimations = () => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.fromTo('.hero-badge', { opacity: 0, scale: 0.95 }, { opacity: 0.8, scale: 1, duration: 0.6 });
      tl.fromTo('.hero-title span', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, '-=0.4');
      tl.fromTo('.hero-desc', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.6');
      tl.fromTo('.hero-actions', { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.5');
      tl.fromTo('.workflow-step', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.4');
      tl.fromTo('.use-case-card', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.4');
    };

    const hasPlayed = sessionStorage.getItem('intro-played') === 'true';
    if (hasPlayed) {
      runAnimations();
    } else {
      const handleIntroComplete = () => {
        runAnimations();
      };
      window.addEventListener('intro-complete', handleIntroComplete);
      return () => {
        window.removeEventListener('intro-complete', handleIntroComplete);
      };
    }
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-page container">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="hero-text-content" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
          <div className="hero-badge" style={{ opacity: 0.8 }}>
            <span className="pulse-indicator" style={{ background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
            <span>Enterprise SQL Intelligence Platform</span>
          </div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.8rem)', fontWeight: 800, textTransform: 'uppercase', lineHeight: 1.0, letterSpacing: '-0.04em', margin: '16px 0 24px 0' }}>
            <span>Enterprise Data</span> <br />
            <span className="accented">Intelligence. Redefined.</span>
          </h1>
          <p className="hero-desc" style={{ color: 'var(--text)', opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '32px', maxWidth: '640px' }}>
            Analyst.AI compiles natural language into compiler-validated SQL using the Model Context Protocol. Zero local data egress. Audited and secure database queries executed locally inside your perimeter.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={handleGetStarted} style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
              <span>Get Started</span>
              <ArrowRight size={16} />
            </button>
            <button className="btn-secondary" onClick={() => navigate('/docs')} style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
              <span>View Schema Catalog</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. DYNAMIC WORKFLOW DIAGRAM */}
      <section className="workflow-section" style={{ marginTop: '60px', marginBottom: '80px' }}>
        <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 48px auto', maxWidth: '600px' }}>
          <span className="section-label">[ Secure Pipeline ]</span>
          <h2>Zero-Egress Execution Workflow</h2>
          <p>How the platform translates, validates, and runs database statements securely without sending raw data to the cloud.</p>
        </div>

        <div className="workflow-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {[
            { step: '01', Icon: Cpu, title: 'NL Translation', desc: 'Gemini compiles natural language input into verified SQLite queries based on table schemas.' },
            { step: '02', Icon: Shield, title: 'Read-Only Sandbox', desc: 'The query is parsed and checked to ensure only safe SELECT statements are executed.' },
            { step: '03', Icon: Network, title: 'MCP Secure Tunnel', desc: 'The SQL statement is executed locally over standard stdio subprocess pipes.' },
            { step: '04', Icon: Activity, title: 'Instant Analytics', desc: 'JSON outputs are dynamically rendered into customized charts and datatables.' }
          ].map((item, idx) => (
            <div key={item.step} className="workflow-step glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 300, fontFamily: 'var(--font-mono)', opacity: 0.15 }}>{item.step}</span>
                <div style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-heading)' }}>
                  <item.Icon size={16} />
                </div>
              </div>
              <div>
                <h4 style={{ color: 'var(--text-heading)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>{item.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.8, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
              {idx < 3 && (
                <div className="workflow-connector" style={{ position: 'absolute', top: '50%', right: '-10px', transform: 'translateY(-50%)', width: '20px', height: '1px', background: 'var(--border)', zIndex: 1 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. ROI & VALUE PROPOSITION */}
      <section className="use-cases-section" style={{ marginBottom: '80px' }}>
        <div className="section-header" style={{ textAlign: 'center', margin: '0 auto 48px auto', maxWidth: '600px' }}>
          <span className="section-label">[ Profitability & ROI ]</span>
          <h2>Platform Value & Economic Benefits</h2>
          <p>Discover how teams leverage our secure SQL agent interface to cut telemetry costs and maximize decision velocity.</p>
        </div>

        <div className="use-cases-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {[
            {
              Icon: Zap,
              metric: '90%',
              title: 'Compute Savings',
              label: 'Resource Efficiency',
              desc: 'High-speed RAM caching blocks redundant compile runs, slashing external API overheads and database host CPU consumption.'
            },
            {
              Icon: Database,
              metric: '35%',
              title: 'Operational Velocity',
              label: 'Self-Service Analytics',
              desc: 'Enables sales agents, customer support, and managers to query data in natural English, eliminating engineering backlogs entirely.'
            },
            {
              Icon: Shield,
              metric: '$0',
              title: 'Compliance Liability',
              label: 'Risk Protection',
              desc: 'Sandbox isolation maintains a zero-egress posture, preventing cloud storage audit breaches and expensive security penalty fees.'
            }
          ].map((item) => (
            <div key={item.title} className="use-case-card glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ background: 'rgba(var(--primary-rgb), 0.03)', border: '1px solid var(--border)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-heading)' }}>
                  <item.Icon size={20} />
                </div>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-heading)', opacity: 0.9 }}>
                  {item.metric}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', opacity: 0.5 }}>{item.label}</span>
                <h4 style={{ color: 'var(--text-heading)', fontSize: '1.15rem', fontWeight: 700, margin: '4px 0 8px 0' }}>{item.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', opacity: 0.8, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. CALL TO ACTION */}
      <section className="cta-section" style={{ textAlign: 'center', padding: '60px 40px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '-0.02em' }}>Secure your database intelligence today</h2>
        <p style={{ color: 'var(--text)', opacity: 0.8, fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
          Run read-only database queries locally, compile optimized charts instantly, and review session audit logs under a unified monochrome console.
        </p>
        <button className="btn-primary" onClick={handleGetStarted} style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
          <span>Launch Console Portal</span>
          <ArrowRight size={16} />
        </button>
      </section>

      <style>{`
        .hero-section {
          padding: 80px 0 60px 0;
        }
        @media (max-width: 768px) {
          .workflow-grid, .use-cases-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .workflow-connector {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;