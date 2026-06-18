// Landing page — vulnerability submission terminal
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vulnbridgeApi, Severity } from '../lib/api';

const SEVERITY_COLORS: Record<Severity, string> = {
  low: '#44ff44',
  medium: '#ffaa00',
  high: '#ff6600',
  critical: '#ff0000',
};

export function Landing() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'critical' as Severity,
    affected_systems: '',
    researcher_email: '',
    researcher_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await vulnbridgeApi.submitVulnerability(form);
      const { case_id } = resp.data;
      navigate(`/cases/${case_id}`);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.title?.[0] || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ fontFamily: 'var(--font-vt)', fontSize: 48, color: 'var(--green)', letterSpacing: '0.3em', textShadow: '0 0 30px rgba(0,255,65,0.5)' }}>
          VULNBRIDGE
        </div>
        <div style={{ fontFamily: 'var(--font-vt)', fontSize: 18, color: 'var(--text-dim)', letterSpacing: '0.2em', marginTop: 4 }}>
          AUTONOMOUS VULNERABILITY DISCLOSURE AGENT
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-dim)', maxWidth: 500, lineHeight: 1.8 }}>
          Powered by <span style={{ color: 'var(--amber)' }}>Terminal 3 TEE</span> — hardware-enforced authority delegation
          for cross-functional security coordination.
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ width: '100%', maxWidth: 560 }}
      >
        <div className="terminal-card" style={{ padding: 32 }}>
          <div style={{ fontFamily: 'var(--font-vt)', fontSize: 20, color: 'var(--green)', marginBottom: 24, letterSpacing: '0.15em' }}>
            &gt; SUBMIT VULNERABILITY REPORT
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
                Vulnerability Title *
              </label>
              <input
                className="terminal-input"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Critical RCE in payment service"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
                Severity *
              </label>
              <select className="terminal-input" value={form.severity} onChange={set('severity')} required>
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="critical">CRITICAL</option>
              </select>
              <div style={{ marginTop: 6, height: 4, background: SEVERITY_COLORS[form.severity], opacity: 0.7 }} />
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
                Description *
              </label>
              <textarea
                className="terminal-input"
                value={form.description}
                onChange={set('description')}
                placeholder="Detailed description of the vulnerability and how it can be exploited..."
                rows={4}
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
                Affected Systems (comma-separated)
              </label>
              <input
                className="terminal-input"
                value={form.affected_systems}
                onChange={set('affected_systems')}
                placeholder="api-gateway v2.1, payment-service v1.4"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
                  Your Email *
                </label>
                <input
                  className="terminal-input"
                  type="email"
                  value={form.researcher_email}
                  onChange={set('researcher_email')}
                  placeholder="researcher@domain.com"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>
                  Your Name
                </label>
                <input
                  className="terminal-input"
                  value={form.researcher_name}
                  onChange={set('researcher_name')}
                  placeholder="Optional"
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,51,51,0.1)', border: '1px solid var(--red)', padding: '10px 14px', fontSize: 12, color: 'var(--red)' }}>
                ✕ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-green"
              disabled={loading}
              style={{ fontSize: 13, padding: '12px 24px', marginTop: 8 }}
            >
              {loading ? 'CREATING CASE IN VULNBRIDGE...' : 'SUBMIT VULNERABILITY'}
            </button>
          </div>
        </div>
      </form>

      {/* Footer */}
      <div style={{ marginTop: 32, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', letterSpacing: '0.1em' }}>
        VULNBRIDGE AGENT · TERMINAL 3 INTEGRATION · IMMUTABLE AUDIT TRAIL
      </div>
    </div>
  );
}
