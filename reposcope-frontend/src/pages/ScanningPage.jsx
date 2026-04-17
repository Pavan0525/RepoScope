import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, AlertCircle, Home } from 'lucide-react';

const PHASES = [
  { id: 'fetch',   label: '> connecting to github api...',       done: '✓ repository fetched' },
  { id: 'parse',   label: '> parsing file tree and structure…',  done: '✓ 24 files indexed' },
  { id: 'analyze', label: '> running ai analysis engine...',     done: '✓ llm inference complete' },
  { id: 'render',  label: '> compiling audit report...',         done: '✓ dashboard ready' },
];

export default function ScanningPage() {
  const [activePhase, setActivePhase]   = useState(0);
  const [completedPhases, setCompleted] = useState([]);
  const [errorMsg, setErrorMsg]         = useState(null);
  const [typedLabel, setTypedLabel]     = useState('');

  const location   = useLocation();
  const navigate   = useNavigate();
  const phaseRef   = useRef(0);

  const searchParams = new URLSearchParams(location.search);
  const repoUrl      = searchParams.get('url');
  const compareUrl   = searchParams.get('compare');

  // Typewriter for active phase label
  useEffect(() => {
    const target = PHASES[activePhase]?.label || '';
    setTypedLabel('');
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTypedLabel(target.slice(0, i));
      if (i >= target.length) clearInterval(t);
    }, 28);
    return () => clearInterval(t);
  }, [activePhase]);

  useEffect(() => {
    if (!repoUrl) { navigate('/'); return; }

    const advancePhase = (n) => {
      phaseRef.current = n;
      setCompleted((c) => [...c, PHASES[n - 1]?.id]);
      setActivePhase(n);
    };

    const phaseTimer = setInterval(() => {
      const next = phaseRef.current + 1;
      if (next < PHASES.length) advancePhase(next);
    }, 2800);

    const performScan = async () => {
      try {
        if (!compareUrl) {
          const res  = await fetch('http://127.0.0.1:5000/analyze', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ repo_url: repoUrl }),
          });
          const data = await res.json();
          clearInterval(phaseTimer);
          if (data.success) {
            setCompleted(PHASES.map((p) => p.id));
            setActivePhase(PHASES.length);
            setTimeout(() => navigate('/results', { state: { resultData: data } }), 700);
          } else {
            handleFallback(data.error);
          }
        } else {
          const [res1, res2] = await Promise.allSettled([
            fetch('http://127.0.0.1:5000/analyze', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repo_url: repoUrl }),
            }).then((r) => r.json()),
            fetch('http://127.0.0.1:5000/analyze', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repo_url: compareUrl }),
            }).then((r) => r.json()),
          ]);
          clearInterval(phaseTimer);

          const data1 = res1.status === 'fulfilled' ? res1.value : { success: false, error: 'Network error' };
          const data2 = res2.status === 'fulfilled' ? res2.value : { success: false, error: 'Network error' };

          if (!data1.success && !data2.success) { handleFallback('Both repos failed.'); return; }

          setCompleted(PHASES.map((p) => p.id));
          setActivePhase(PHASES.length);
          setTimeout(() => navigate('/results', { state: { resultData: data1, compareData: data2, isComparison: true } }), 700);
        }
      } catch {
        clearInterval(phaseTimer);
        handleFallback('Network error');
      }
    };

    const handleFallback = (errText) => {
      clearInterval(phaseTimer);
      setErrorMsg(`Engine failed. Loading sample insights. (${errText})`);
      const fallback = {
        success: true,
        meta: { repo: repoUrl, stars: 1024, forks: 256, files_analyzed: 14, default_branch: 'main', description: 'Fallback sample data' },
        data: {
          tech_debt_score: 55,
          critical_issues: ['Global state management is brittle', 'Missing error boundaries', 'No test coverage'],
          refactoring_suggestions: ['Extract components to separate files', 'Add unit tests', 'Implement centralized state management'],
          architecture_assessment: 'The codebase shows a typical fast-iteration structure. Modularizing core logic will improve maintainability.',
          positive_findings: ['Consistent variable naming', 'Modern syntax utilized'],
        },
        analysis_info: { elapsed_sec: 1.2 },
      };
      setTimeout(() => navigate('/results', { state: { resultData: fallback, isFallback: true } }), 3000);
    };

    performScan();
    return () => clearInterval(phaseTimer);
  }, [repoUrl, compareUrl, navigate]);

  const mockCode = `const audit = require('@reposcope/engine');\nconst repo = process.env.REPO_URL;\naudit.run(repo, { depth: 'full', ai: true })\n  .then(r => r.render())\n  .catch(e => console.error(e));\n`;

  return (
    <div className="container flex-center" style={{ minHeight: '80vh', position: 'relative' }}>

      <button
        onClick={() => navigate('/')}
        className="btn-secondary"
        style={{ position: 'absolute', top: '2rem', left: '2.5rem', zIndex: 20 }}
      >
        <Home size={16} /> Home
      </button>

      <div className="code-backdrop">{mockCode.repeat(80)}</div>
      <div className="scanline" />

      <motion.div
        className="glass"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ padding: '2.5rem', width: '100%', maxWidth: '560px', position: 'relative', zIndex: 10 }}
      >
        <AnimatePresence mode="wait">
          {errorMsg ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 1rem', color: 'var(--warning)' }} />
              <h2 style={{ color: 'var(--warning)', marginBottom: '0.75rem', fontSize: '1.3rem' }}>Fallback Triggered</h2>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{errorMsg}</p>
              <p style={{ color: '#4b5563', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                loading sample data...
              </p>
            </motion.div>
          ) : (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                <div
                  style={{
                    padding: '0.5rem',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '6px',
                  }}
                >
                  <Terminal size={20} color="var(--accent)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Auditing Repository</div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--accent)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '360px',
                    }}
                  >
                    {compareUrl ? `${repoUrl} ⇄ ${compareUrl}` : repoUrl}
                  </div>
                </div>
              </div>

              {/* Terminal log box */}
              <div className="terminal-box">
                {/* Completed phases */}
                {completedPhases.map((id) => {
                  const p = PHASES.find((ph) => ph.id === id);
                  return p ? (
                    <div key={id} className="log-line-done">
                      {p.done}
                    </div>
                  ) : null;
                })}

                {/* Active phase with typewriter */}
                {activePhase < PHASES.length && (
                  <div className="log-line-active">
                    {typedLabel}
                    <span className="cursor-blink" style={{ width: '6px', height: '0.85em' }} />
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#4b5563', fontFamily: 'var(--font-mono)' }}>
                    progress
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                    {Math.round((completedPhases.length / PHASES.length) * 100)}%
                  </span>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(completedPhases.length / PHASES.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
