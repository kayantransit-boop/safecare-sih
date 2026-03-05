import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import VitalsDashboard from './components/VitalsDashboard';
import StaffDashboard from './components/StaffDashboard';
import SejoursDashboard from './components/SejoursDashboard';
import FacturationDashboard from './components/FacturationDashboard';
import LaboratoireDashboard from './components/LaboratoireDashboard';

const API = import.meta.env.VITE_API_URL || '/api';

const MENU = [
  { key: 'patients',    label: 'Patients',     icon: '👥', desc: 'Dossiers & Signes vitaux' },
  { key: 'sejours',     label: 'Séjours',      icon: '🛏️', desc: 'Admissions & Sorties' },
  { key: 'labo',        label: 'Laboratoire',  icon: '🔬', desc: 'Analyses & Résultats' },
  { key: 'facturation', label: 'Facturation',  icon: '🧾', desc: 'Factures & Paiements' },
  { key: 'staff',       label: 'Personnel',    icon: '👨‍⚕️', desc: 'Équipe médicale' },
];

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, textAlign: 'center', padding: '12px 0' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'white', letterSpacing: 1 }}>
        {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div>{time.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(!!localStorage.getItem('safecare_auth'));
  const [page, setPage] = useState('patients');
  const [alerts, setAlerts] = useState([]);
  const [occupancy, setOccupancy] = useState(null);

  useEffect(() => {
    if (!auth) return;
    const load = () => {
      fetch(`${API}/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {});
      fetch(`${API}/occupancy`).then(r => r.json()).then(d => setOccupancy(d)).catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [auth]);

  function logout() {
    localStorage.removeItem('safecare_auth');
    setAuth(false);
  }

  if (!auth) return <LoginPage onLogin={() => setAuth(true)} />;

  const occPct = occupancy ? Math.round((occupancy.occupied / occupancy.total) * 100) : 0;
  const occColor = occPct >= 90 ? '#ef4444' : occPct >= 70 ? '#f59e0b' : '#10b981';

  return (
    <div className="app-layout">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ fontSize: 32, marginBottom: 6 }}>🏥</div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>Kayan Clinique</div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Système d'Information Hospitalier</div>
        </div>

        {/* Horloge */}
        <Clock />

        {/* Navigation */}
        <nav className="sidebar-nav">
          {MENU.map(m => (
            <button
              key={m.key}
              className={`sidebar-nav-item ${page === m.key ? 'active' : ''}`}
              onClick={() => setPage(m.key)}
            >
              <span className="sidebar-nav-icon">{m.icon}</span>
              <div>
                <div className="sidebar-nav-label">{m.label}</div>
                <div className="sidebar-nav-desc">{m.desc}</div>
              </div>
              {m.key === 'labo' && alerts.length > 0 && (
                <span className="sidebar-badge">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Occupation des lits */}
        {occupancy && (
          <div style={{ padding: '0 16px', marginTop: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 6 }}>OCCUPATION DES LITS</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{occupancy.occupied}/{occupancy.total}</span>
                <span style={{ fontSize: 12, color: occColor, fontWeight: 700 }}>{occPct}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${occPct}%`, height: '100%', background: occColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        )}

        {/* Footer utilisateur */}
        <div className="sidebar-footer">
          <div className="avatar" style={{ background: '#2563eb', width: 34, height: 34, fontSize: 13, flexShrink: 0 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'white' }}>Administrateur</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>admin@safecare.dj</div>
          </div>
          <button onClick={logout} title="Déconnexion" style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '6px 8px', fontSize: 14,
          }}>🚪</button>
        </div>
      </aside>

      {/* ── CONTENU PRINCIPAL ── */}
      <div className="content-area">
        {/* Top bar */}
        <div className="topbar">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f' }}>
              {MENU.find(m => m.key === page)?.icon} {MENU.find(m => m.key === page)?.label}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {MENU.find(m => m.key === page)?.desc}
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="alert-topbar">
              <div className="alert-banner-dot" />
              <strong>{alerts.length} alerte{alerts.length > 1 ? 's' : ''} critique{alerts.length > 1 ? 's' : ''}</strong>
              {alerts.slice(0, 2).map((a, i) => (
                <span key={i} style={{ fontSize: 12 }}>
                  — {a.nom} <span style={{ fontWeight: 700, color: '#fca5a5' }}>NEWS2:{a.news2_score}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {page === 'patients'    && <VitalsDashboard occupancy={occupancy} alerts={alerts} />}
          {page === 'sejours'     && <SejoursDashboard />}
          {page === 'labo'        && <LaboratoireDashboard />}
          {page === 'facturation' && <FacturationDashboard />}
          {page === 'staff'       && <StaffDashboard />}
        </div>
      </div>
    </div>
  );
}
