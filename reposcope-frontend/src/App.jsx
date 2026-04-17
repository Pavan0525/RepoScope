import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Telescope, Globe } from 'lucide-react';
import LandingPage  from './pages/LandingPage';
import ScanningPage from './pages/ScanningPage';
import ResultsPage  from './pages/ResultsPage';

function App() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>

      {/* ── Nav ── */}
      <nav className="top-nav">
        <Link to="/" className="logo">
          <Telescope size={22} color="var(--accent)" />
          Repo<span>Scope</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Globe size={16} />
            GitHub
          </a>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/"        element={<LandingPage />}  />
          <Route path="/analyze" element={<ScanningPage />} />
          <Route path="/results" element={<ResultsPage />}  />
        </Routes>
      </main>
    </div>
  );
}

export default App;
