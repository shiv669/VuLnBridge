// Landing page — vulnerability submission terminal
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vulnbridgeApi, Severity } from '../lib/api';

import { CosmicParallaxBg } from '../components/ui/parallax-cosmic-background';
import { ProgressiveFluxLoader } from '../components/ui/progressive-flux-loader';



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
      
      // Artificial delay to show the cryptographic flux loading animation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      navigate(`/cases/${case_id}`);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.title?.[0] || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 bg-black overflow-hidden" style={{ fontFamily: 'var(--font-vt)' }}>
      
      {/* Animated Cosmic Background */}
      <CosmicParallaxBg 
        head="VULNBRIDGE" 
        text="AUTONOMOUS, VULNERABILITY, DISCLOSURE, AGENT" 
        loop={true}
        className="fixed inset-0 z-0"
      />
      
      {/* Centered Glassmorphic Form Card */}
      <div className="relative z-10 w-full max-w-2xl mt-48">
        <form
          onSubmit={handleSubmit}
          className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl"
        >
          <div className="text-2xl text-white mb-8 tracking-widest text-center">
            SUBMIT VULNERABILITY REPORT
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <label className="block text-white/60 text-sm tracking-widest mb-2 uppercase">
                Vulnerability Title *
              </label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors"
                value={form.title}
                onChange={set('title')}
                placeholder="e.g. Critical RCE in payment service"
                required
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm tracking-widest mb-2 uppercase">
                Severity *
              </label>
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors appearance-none"
                value={form.severity} 
                onChange={set('severity')} 
                required
              >
                <option value="low" className="bg-slate-900">LOW</option>
                <option value="medium" className="bg-slate-900">MEDIUM</option>
                <option value="high" className="bg-slate-900">HIGH</option>
                <option value="critical" className="bg-slate-900">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-sm tracking-widest mb-2 uppercase">
                Description *
              </label>
              <textarea
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors min-h-[120px]"
                value={form.description}
                onChange={set('description')}
                placeholder="Detailed description of the vulnerability and how it can be exploited..."
                required
              />
            </div>

            <div>
              <label className="block text-white/60 text-sm tracking-widest mb-2 uppercase">
                Affected Systems
              </label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors"
                value={form.affected_systems}
                onChange={set('affected_systems')}
                placeholder="e.g. api-gateway v2.1 (comma-separated)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/60 text-sm tracking-widest mb-2 uppercase">
                  Your Email *
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors"
                  type="email"
                  value={form.researcher_email}
                  onChange={set('researcher_email')}
                  placeholder="researcher@domain.com"
                  required
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm tracking-widest mb-2 uppercase">
                  Your Name
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500 focus:bg-white/10 transition-colors"
                  value={form.researcher_name}
                  onChange={set('researcher_name')}
                  placeholder="Optional"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm tracking-wide">
                ✕ {error}
              </div>
            )}

            <div className="mt-4 flex justify-center">
              {loading ? (
                <div className="w-full">
                  <ProgressiveFluxLoader loop={true} duration={4} />
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg text-xl tracking-widest transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                >
                  SUBMIT VULNERABILITY
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-white/40 text-sm tracking-[0.2em] uppercase">
          Powered by Terminal 3 TEE · Immutable Audit Trail
        </div>
      </div>
    </div>
  );
}
