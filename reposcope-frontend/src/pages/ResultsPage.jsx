import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Wrench, CheckCircle2, Star, GitFork,
  Search, Download, Copy, Baby, Zap, Clock,
  ShieldCheck, FileWarning, Home, Users, GitCommitHorizontal,
  AlertTriangle, Info, Activity, Scale, Trophy, Calendar,
  HardDrive, Tag, ExternalLink,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

// ── Helpers ────────────────────────────────────────────────────────────────
const getScoreInfo = (s) => {
  if (s >= 75) return { label: 'Good', color: 'var(--success)', desc: 'Low maintenance overhead — this codebase is in solid shape with manageable debt.' };
  if (s >= 50) return { label: 'Moderate', color: 'var(--warning)', desc: 'Some technical debt present. Addressable with focused refactoring sprints.' };
  return { label: 'High Debt', color: 'var(--danger)', desc: 'Significant debt accumulation. Recommend a dedicated cleanup cycle before scaling.' };
};

const getGrade = (s) => (s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : 'D');

// Severity tag for each issue (deterministic by index)
const SEVERITY = [
  { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  { label: 'HIGH',     color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)' },
  { label: 'MEDIUM',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
];

// Language colours (common ones, fallback to grey)
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', 'C++': '#f34b7d', C: '#555555', 'C#': '#178600',
  Go: '#00ADD8', Rust: '#dea584', Ruby: '#701516', PHP: '#4F5D95',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Kotlin: '#A97BFF',
  Swift: '#F05138', Dart: '#00B4AB', Vue: '#41b883', Svelte: '#FF3D00',
};
const langColor = (name) => LANG_COLORS[name] || '#6b7280';

const ProgressBar = ({ value, color, animated = true }) => (
  <div className="progress-track">
    <motion.div
      className="progress-fill"
      initial={{ width: animated ? 0 : `${value}%` }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
      style={{ background: color }}
    />
  </div>
);

const MetricCard = ({ label, value, color, grade }) => (
  <div className="glass" style={{ padding: '1.25rem 1.5rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.05rem', color }}>
        {grade}
      </span>
    </div>
    <ProgressBar value={value} color={color} />
    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#374151', fontFamily: 'var(--font-mono)', marginTop: '0.3rem' }}>
      {value}/100
    </div>
  </div>
);

// Stat pill used in "At a Glance" card
const StatPill = ({ icon: Icon, label, value, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '80px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#4b5563', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      <Icon size={11} /> {label}
    </div>
    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: color || 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
      {value}
    </div>
  </div>
);

// Language breakdown bar
const LanguageBar = ({ languages }) => {
  if (!languages || Object.keys(languages).length === 0) return null;
  const entries = Object.entries(languages).slice(0, 6);

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', gap: '2px' }}>
        {entries.map(([lang, pct]) => (
          <motion.div
            key={lang}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            style={{ background: langColor(lang), height: '100%', borderRadius: '2px' }}
            title={`${lang}: ${pct}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.6rem' }}>
        {entries.map(([lang, pct]) => (
          <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#6b7280' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: langColor(lang), flexShrink: 0 }} />
            {lang} <span style={{ color: '#374151' }}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

// ── Single Repo Dashboard ──────────────────────────────────────────────────
function SingleDashboard({ payload, isFallback, isDemo, isBeginner, isWinner }) {
  const { meta, data, analysis_info = {} } = payload;

  if (!payload.success) {
    return (
      <div className="glass" style={{ padding: '2rem', flex: 1 }}>
        <h2 style={{ color: 'var(--danger)' }}>Analysis Failed</h2>
        <p>{payload.error || 'Network error resolving this repository.'}</p>
      </div>
    );
  }

  const score     = data.tech_debt_score;
  const scoreInfo = getScoreInfo(score);

  const maintainability = Math.min(100, Math.max(0, score + (score % 7) - 3));
  const security        = Math.min(100, Math.max(0, score + (score % 5) - 2));
  const improvement     = Math.min(100, score + ((data.critical_issues?.length || 0) * 8) + 5);

  const projectType   = score > 75 ? 'Production Ready' : score > 45 ? 'Prototype / Refactoring' : 'Learning Project';
  const confidenceStr = data.confidence || 'moderate';
  let   confidencePct = 60;
  if (confidenceStr === 'high')     confidencePct = 95;
  if (confidenceStr === 'moderate') confidencePct = 75;
  if (confidenceStr === 'low')      confidencePct = 40;
  if (meta.files_analyzed) confidencePct = Math.min(99, Math.max(confidencePct, meta.files_analyzed * 4));

  const elapsed = analysis_info.elapsed_sec ? `${Math.round(analysis_info.elapsed_sec * 10) / 10}s` : '0.8s';

  const mapStr = (str) => {
    if (!isBeginner) return str;
    return str
      .replace(/cyclomatic complexity/gi, 'complex logic leaps')
      .replace(/monolithic/gi, 'giant and hard to read')
      .replace(/concurrency/gi, 'simultaneous tasks crashing')
      .replace(/global state/gi, 'variables exposed to everything')
      .replace(/memory leaks/gi, 'excessive memory usage')
      .replace(/coupling/gi, 'files being too tangled together')
      .replace(/CI\/CD/gi, 'automated deployment pipelines');
  };

  const handleCopyFixes = () => {
    const fixes = data.refactoring_suggestions.map((s, i) => `${i + 1}. ${mapStr(s)}`).join('\n');
    navigator.clipboard.writeText(`🔧 RepoScope Action Items for ${meta.repo}:\n\n${fixes}`);
    const el = document.getElementById(`copy-btn-${meta.repo}`);
    if (el) { el.innerText = 'Copied!'; setTimeout(() => (el.innerText = 'Copy Fixes'), 2000); }
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(
      `📊 ${meta.repo} — RepoScope Audit\nTech Debt Score: ${score}/100 (${scoreInfo.label})\nProject Type: ${projectType}\nAnalyzed by RepoScope AI`
    );
    const el = document.getElementById(`share-btn-${meta.repo}`);
    if (el) { el.innerText = 'Copied!'; setTimeout(() => (el.innerText = 'Share'), 2000); }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    let y = 20;
    const addLine = (text, bold = false, size = 12) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, 170);
      lines.forEach((line) => { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += size * 0.5 + 2; });
    };
    addLine('REPOSCOPE CODE AUDIT', true, 18); y += 4;
    addLine(`Repo: ${meta.repo}`);
    addLine(`Timestamp: ${new Date().toLocaleString()}`);
    addLine(`Score: ${score}/100 (${scoreInfo.label})`);
    addLine(`Project Type: ${projectType}`);
    addLine(`Confidence: ${confidencePct}%`); y += 8;
    addLine('CRITICAL ISSUES', true, 14); y += 2;
    data.critical_issues.forEach((i) => addLine(`• ${mapStr(i)}`));
    y += 6;
    addLine('REFACTORING PLAN', true, 14); y += 2;
    data.refactoring_suggestions.forEach((s) => addLine(`• ${mapStr(s)}`));
    y += 6;
    addLine('ARCHITECTURE ASSESSMENT', true, 14); y += 2;
    addLine(mapStr(data.architecture_assessment));
    y += 6;
    addLine('STRENGTHS', true, 14); y += 2;
    data.positive_findings.forEach((p) => addLine(`• ${mapStr(p)}`));
    doc.save(`RepoScope_${meta.repo.replace('/', '_')}.pdf`);
  };

  const cVars = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const iVars = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } };

  return (
    <motion.div variants={cVars} initial="hidden" animate="show"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: '340px' }}>

      {/* ── Winner badge (compare mode) ── */}
      {isWinner && (
        <motion.div variants={iVars} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.7rem 1rem', borderRadius: 'var(--radius-md)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
          <Trophy size={16} /> Winner — Higher Health Score
        </motion.div>
      )}

      {/* ── Alert Badges ── */}
      {(isFallback || isDemo) && (
        <motion.div variants={iVars}>
          {isFallback && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.87rem' }}>
              <FileWarning size={15} /> Engine failed — showing sample fallback insights.
            </div>
          )}
          {isDemo && (
            <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.87rem' }}>
              <Zap size={15} /> Demo Mode — presenting facebook/react sample data
            </div>
          )}
        </motion.div>
      )}

      {/* ── Header + Score ── */}
      <motion.div variants={iVars} className="glass glass-glow" style={{ padding: '1.75rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontFamily: 'var(--font-mono)', margin: 0 }}>{meta.repo}</h2>
              <span style={{ fontSize: '0.7rem', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '0.2rem 0.6rem', borderRadius: '4px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {projectType}
              </span>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.55, marginBottom: 0 }}>
              {meta.description || 'No description provided.'}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span className="status-badge badge-info"><Clock size={11} /> {elapsed}</span>
              <span className="status-badge" style={{ background: confidencePct >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: confidencePct >= 80 ? '#34d399' : '#fbbf24', border: `1px solid ${confidencePct >= 80 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <ShieldCheck size={11} /> {confidencePct}% confidence
              </span>
              <span className="status-badge badge-info"><Activity size={11} /> {meta.files_analyzed} files scanned</span>
            </div>
          </div>

          {/* Score circle */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div className="score-circle flex-center" style={{ width: '110px', height: '110px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <motion.path
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: `${score}, 100` }}
                  transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke={scoreInfo.color} strokeWidth="3.5" strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: scoreInfo.color }}>{score}</span>
              </div>
            </div>
            <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: scoreInfo.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {scoreInfo.label}
            </div>
          </div>
        </div>

        {/* Score context blurb */}
        <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${scoreInfo.color}`, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Info size={14} color={scoreInfo.color} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.6 }}>{scoreInfo.desc}</p>
        </div>
      </motion.div>

      {/* ── Repo At a Glance ── */}
      <motion.div variants={iVars} className="glass" style={{ padding: '1.5rem 1.75rem' }}>
        <div className="section-header">
          <Activity size={15} color="var(--accent-2)" />
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Repo At a Glance</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem 2rem' }}>
          <StatPill icon={Star}               label="Stars"       value={fmt(meta.stars || 0)}       color="#fcd34d" />
          <StatPill icon={GitFork}            label="Forks"       value={fmt(meta.forks || 0)}       color="#a78bfa" />
          <StatPill icon={AlertTriangle}      label="Issues"      value={meta.open_issues || 0}      color={meta.open_issues > 100 ? '#f87171' : '#fb923c'} />
          <StatPill icon={Users}              label="Contributors" value={meta.contributors || '—'}  color="#34d399" />
          <StatPill icon={GitCommitHorizontal} label="Commits"   value={fmt(meta.commit_count || 0)} color="#60a5fa" />
          <StatPill icon={HardDrive}          label="Size"        value={meta.size_kb ? `${Math.round(meta.size_kb / 1024)}MB` : '—'} />
          <StatPill icon={Scale}              label="License"     value={meta.license || 'None ⚠'}  color={meta.license ? undefined : '#f87171'} />
          <StatPill icon={Calendar}           label="Created"     value={fmtDate(meta.created_at)}   color="#94a3b8" />
          <StatPill icon={Calendar}           label="Updated"     value={fmtDate(meta.last_updated)} color="#94a3b8" />
        </div>

        {/* Topics */}
        {meta.topics?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
            {meta.topics.map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#22d3ee' }}>
                <Tag size={10} /> {t}
              </span>
            ))}
          </div>
        )}

        {/* Language Breakdown */}
        {meta.language_breakdown && Object.keys(meta.language_breakdown).length > 0 && (
          <div style={{ marginTop: '1.2rem' }}>
            <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
              Language Breakdown
            </div>
            <LanguageBar languages={meta.language_breakdown} />
          </div>
        )}
      </motion.div>

      {/* ── Metric Breakdown ── */}
      <motion.div variants={iVars} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem' }}>
        <MetricCard label="Maintainability" value={maintainability} color={maintainability >= 70 ? 'var(--success)' : 'var(--warning)'} grade={getGrade(maintainability)} />
        <MetricCard label="Security"        value={security}        color={security >= 70 ? 'var(--success)' : 'var(--warning)'}        grade={getGrade(security)} />
        <MetricCard label="After Fixes"     value={improvement}     color="#06b6d4" grade={`→${improvement}`} />
      </motion.div>

      {/* ── Critical Issues ── */}
      <motion.div variants={iVars} className="glass" style={{ padding: '1.75rem' }}>
        <div className="section-header">
          <ShieldAlert size={16} color="var(--danger)" />
          <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--danger)', margin: 0 }}>Critical Issues</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {data.critical_issues.map((iss, i) => {
            const sev = SEVERITY[i % SEVERITY.length];
            return (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '0.25rem 0.5rem', background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: '3px', color: sev.color, flexShrink: 0, marginTop: '2px', letterSpacing: '0.04em' }}>
                  {sev.label}
                </span>
                <p style={{ margin: 0, color: '#fca5a5', lineHeight: 1.55, fontSize: '0.88rem' }}>{mapStr(iss)}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Refactoring Plan ── */}
      <motion.div variants={iVars} className="glass" style={{ padding: '1.75rem' }}>
        <div className="section-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wrench size={16} color="var(--warning)" />
            <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--warning)', margin: 0 }}>Refactoring Plan</h3>
          </div>
          <button
            id={`copy-btn-${meta.repo}`}
            onClick={handleCopyFixes}
            style={{ background: 'rgba(245,158,11,0.07)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.2)', padding: '0.3rem 0.7rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', transition: 'all 0.2s' }}
          >
            <Copy size={12} /> Copy Fixes
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {data.refactoring_suggestions.map((ref, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#4b5563', flexShrink: 0, marginTop: '2px' }}>{String(i + 1).padStart(2, '0')}.</span>
              <p style={{ margin: 0, color: '#fcd34d', lineHeight: 1.55, fontSize: '0.88rem' }}>{mapStr(ref)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Architecture & Strengths ── */}
      <motion.div variants={iVars} className="glass" style={{ padding: '1.75rem' }}>
        <div className="section-header">
          <CheckCircle2 size={16} color="var(--success)" />
          <h3 style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--success)', margin: 0 }}>Architecture &amp; Strengths</h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: '#d1d5db', marginBottom: '1.2rem', lineHeight: 1.7, margin: '0 0 1.2rem' }}>
          {mapStr(data.architecture_assessment)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {data.positive_findings.map((pos, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={13} color="#34d399" style={{ flexShrink: 0, marginTop: '3px' }} />
              <p style={{ margin: 0, color: '#6ee7b7', lineHeight: 1.55, fontSize: '0.88rem' }}>{mapStr(pos)}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Action Buttons ── */}
      <motion.div variants={iVars} style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
        <button onClick={handleDownload} className="btn-primary">
          <Download size={15} /> Download Report
        </button>
        <button
          id={`share-btn-${meta.repo}`}
          onClick={handleCopyShare}
          className="btn-secondary"
          style={{ borderColor: 'rgba(52,211,153,0.2)', color: 'var(--accent)' }}
        >
          <ExternalLink size={14} /> Share
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main Results Page ──────────────────────────────────────────────────────
export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [newUrl, setNewUrl]         = useState('');
  const [isProcessing, setIsProc]   = useState(false);
  const [isBeginner, setIsBeginner] = useState(false);

  if (!location.state || (!location.state.resultData && !location.state.compareData)) {
    return (
      <div className="container flex-center" style={{ minHeight: '80vh', flexDirection: 'column', gap: '1.5rem' }}>
        <Activity size={48} color="var(--accent)" style={{ opacity: 0.3 }} />
        <h2 style={{ color: '#6b7280' }}>No Analysis Data Found</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Return to Scanner</button>
      </div>
    );
  }

  const { resultData, compareData, isFallback, isDemo, isComparison } = location.state;

  // Determine comparison winner (higher score = healthier repo)
  let winner = null;
  if (isComparison && resultData?.data && compareData?.data) {
    if (resultData.data.tech_debt_score > compareData.data.tech_debt_score) winner = 'result';
    else if (compareData.data.tech_debt_score > resultData.data.tech_debt_score) winner = 'compare';
  }

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (newUrl.trim()) {
      setIsProc(true);
      navigate(`/analyze?url=${encodeURIComponent(newUrl)}`);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '5rem', maxWidth: isComparison ? '1400px' : '860px' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 380px', maxWidth: '680px' }}>
          <button type="button" onClick={() => navigate('/')} className="btn-secondary" style={{ flexShrink: 0 }}>
            <Home size={14} /> Home
          </button>
          <form onSubmit={handleAnalyze} style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="#4b5563" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text" className="input-glass mono"
              placeholder="Analyze another repo..."
              value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
              disabled={isProcessing}
              style={{ paddingLeft: '2.5rem', paddingRight: '7rem', fontSize: '0.87rem', padding: '0.72rem 7rem 0.72rem 2.5rem' }}
            />
            <button type="submit" className="btn-primary" disabled={isProcessing || !newUrl.trim()}
              style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', padding: '0.48rem 1rem', fontSize: '0.82rem' }}>
              {isProcessing ? 'Wait…' : 'Analyze →'}
            </button>
          </form>
        </div>
        <button
          onClick={() => setIsBeginner(!isBeginner)}
          className="btn-secondary"
          style={isBeginner ? { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--accent)' } : {}}
        >
          <Baby size={14} /> Beginner Mode {isBeginner ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* ── Dashboards ── */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: isComparison ? 'nowrap' : 'wrap', flexDirection: isComparison && window.innerWidth < 800 ? 'column' : 'row' }}>
        {resultData && (
          <SingleDashboard payload={resultData} isFallback={isFallback} isDemo={isDemo} isBeginner={isBeginner} isWinner={winner === 'result'} />
        )}
        {isComparison && compareData && (
          <SingleDashboard payload={compareData} isFallback={false} isDemo={false} isBeginner={isBeginner} isWinner={winner === 'compare'} />
        )}
      </div>
    </div>
  );
}
