import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import VitalsDashboard from './components/VitalsDashboard';
import StaffDashboard from './components/StaffDashboard';
import SejoursDashboard from './components/SejoursDashboard';

const API = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [auth, setAuth] = useState(!!localStorage.getItem('safecare_auth'));
  const [page, setPage] = useState('patients');
  const [alerts, setAlerts] = useState([]);
  const [occupancy, setOccupancy] = useState(null);

  useEffect(() => {
    if (!auth) return;
    fetch(`${API}/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || [])).catch(() => {});
    fetch(`${API}/occupancy`).then(r => r.json()).then(d => setOccupancy(d)).catch(() => {});
  }, [auth]);

  function logout() {
    localStorage.removeItem('safecare_auth');
    setAuth(false);
  }

  if (!auth) return <LoginPage onLogin={() => setAuth(true)} />;

  const TABS = [
    { key: 'patients', label: '👥 Patients' },
    { key: 'sejours',  label: '🛏️ Séjours' },
    { key: 'staff',    label: '👨‍⚕️ Personnel' },
  ];

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-logo">🏥</div>
        <div>
          <div className="header-title">Kayan Clinique</div>
          <div className="header-sub">Système d'Information Hospitalier</div>
        </div>
        <nav className="nav-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`nav-tab ${page === t.key ? 'nav-tab-active' : 'nav-tab-inactive'}`}
              onClick={() => setPage(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button onClick={logout}
          style={{
            marginLeft: 12, padding: '7px 14px', borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
          🚪 Déconnexion
        </button>
      </div>

      {/* Alerte urgence */}
      {alerts.length > 0 && (
        <div className="alert-banner">
          <div className="alert-banner-dot" />
          <strong>{alerts.length} patient{alerts.length > 1 ? 's' : ''} en risque élevé</strong>
          —
          {alerts.slice(0, 2).map((a, i) => (
            <span key={i}>{a.nom} (NEWS2 : {a.news2_score}){i < Math.min(alerts.length, 2) - 1 ? ', ' : ''}</span>
          ))}
          {alerts.length > 2 && <span> et {alerts.length - 2} autre{alerts.length - 2 > 1 ? 's' : ''}...</span>}
        </div>
      )}

      {page === 'patients' && <VitalsDashboard occupancy={occupancy} alerts={alerts} />}
      {page === 'sejours'  && <SejoursDashboard />}
      {page === 'staff'    && <StaffDashboard />}
    </>
  );
}
