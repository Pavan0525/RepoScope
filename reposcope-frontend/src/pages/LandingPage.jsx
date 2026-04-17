import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Loader2, GitCompare, Play, Zap, Clock, Shield } from 'lucide-react';

const TYPEWRITER_WORDS = ['Tech Debt.', 'Security Risks.', 'Dead Code.', 'Architecture Flaws.'];

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [compareUrl, setCompareUrl] = useState('');
  const [showCompare, setShowCompare] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Typewriter effect
  useEffect(() => {
    const target = TYPEWRITER_WORDS[wordIndex];
    let timeout;

    if (!isDeleting && displayed.length < target.length) {
      timeout = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 80);
    } else if (!isDeleting && displayed.length === target.length) {
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false);
      setWordIndex((wordIndex + 1) % TYPEWRITER_WORDS.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, wordIndex]);

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (url.trim()) {
      setIsProcessing(true);
      setTimeout(() => {
        let target = `/analyze?url=${encodeURIComponent(url)}`;
        if (showCompare && compareUrl.trim()) target += `&compare=${encodeURIComponent(compareUrl)}`;
        navigate(target);
      }, 500);
    }
  };

  const handleDemo = () => {
    const demoData = {
      success: true,
      meta: {
        repo: 'facebook/react',
        stars: 213000,
        forks: 45000,
        files_analyzed: 25,
        default_branch: 'main',
        description: 'The library for web and native user interfaces.',
      },
      data: {
        tech_debt_score: 82,
        critical_issues: [
          'Complex virtual DOM reconciliation logic in fiber loops',
          'Legacy lifecycle hooks remain in older component paths',
        ],
        refactoring_suggestions: [
          'Migrate remaining concurrent mode flags to stable hooks',
          'Break down ReactFiberCommitWork.js into smaller modules',
        ],
        architecture_assessment:
          "React's architecture is highly mature and optimized for concurrent rendering. The codebase demonstrates extreme attention to performance, though the fiber reconciliation core remains unavoidably complex.",
        positive_findings: [
          'Exceptional test coverage across all packages',
          'Strict invariant checks prevent regressions',
          'Clear separation of reconciler and renderers',
        ],
      },
      analysis_info: { elapsed_sec: 0.15 },
    };
    navigate('/results', { state: { resultData: demoData, isDemo: true } });
  };

  return (
    <div
      className="container flex-center"
      style={{ minHeight: '85vh', flexDirection: 'column', gap: '0' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', maxWidth: '760px', width: '100%' }}
      >
        {/* Eyebrow pill */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(16, 185, 129, 0.08)',
            color: '#34d399',
            padding: '0.4rem 1rem',
            borderRadius: '4px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            marginBottom: '2rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.03em',
          }}
        >
          <Sparkles size={14} />
          AI-Powered · Groq LLM · Free
        </motion.div>

        {/* Headline */}
        <h1 style={{ marginBottom: '1.2rem', fontWeight: 800 }}>
          Detect{' '}
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {displayed}
            <span className="cursor-blink" />
          </span>
          <br />
          <span className="text-gradient">in Any GitHub Repo.</span>
        </h1>

        <p
          style={{
            fontSize: '1.1rem',
            marginBottom: '2.5rem',
            maxWidth: '540px',
            margin: '0 auto 2.5rem auto',
            color: '#6b7280',
            lineHeight: 1.7,
          }}
        >
          Drop a GitHub URL. Get a full code audit — tech debt score, critical
          issues, and a refactoring plan — in under 30 seconds.
        </p>

        {/* Search Form */}
        <form
          onSubmit={handleAnalyze}
          style={{ width: '100%', maxWidth: '620px', margin: '0 auto' }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(52,211,153,0.5)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(52, 211, 153, 0.2)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={18}
                color="#4b5563"
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="input-glass mono"
                placeholder="facebook/react  or  github.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  paddingLeft: '2.8rem',
                  paddingRight: '1rem',
                  fontSize: '0.95rem',
                }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={isProcessing || !url.trim()}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Starting…
                </>
              ) : (
                'Run Audit →'
              )}
            </button>
          </div>

          {/* Sub-row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.75rem',
              padding: '0 0.25rem',
            }}
          >
            <button
              type="button"
              onClick={() => setShowCompare(!showCompare)}
              style={{
                background: 'none',
                border: 'none',
                color: showCompare ? 'var(--accent)' : '#4b5563',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                padding: '0',
                transition: 'color 0.2s ease',
              }}
            >
              <GitCompare size={14} />
              {showCompare ? '↑ Hide compare' : 'Compare two repos'}
            </button>

            <button type="button" onClick={handleDemo} className="btn-secondary">
              <Play size={13} />
              Try Demo
            </button>
          </div>

          {/* Compare input */}
          <AnimatePresence>
            {showCompare && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden', marginTop: '0.75rem' }}
              >
                <div style={{ position: 'relative' }}>
                  <GitCompare
                    size={16}
                    color="#4b5563"
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <input
                    type="text"
                    className="input-glass mono"
                    placeholder="Compare with (e.g. vuejs/core)"
                    value={compareUrl}
                    onChange={(e) => setCompareUrl(e.target.value)}
                    disabled={isProcessing}
                    style={{ paddingLeft: '2.8rem', fontSize: '0.9rem' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Stat chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            marginTop: '3rem',
            flexWrap: 'wrap',
          }}
        >
          <div className="stat-chip"><Zap size={13} /> &lt;30s Analysis</div>
          <div className="stat-chip"><Shield size={13} /> Security Audit</div>
          <div className="stat-chip"><Clock size={13} /> Zero Setup</div>
        </motion.div>
      </motion.div>

      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
