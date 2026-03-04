import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#e8b04b', '#14b8a6', '#ec4899'];

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
}

export default function SejoursDashboard() {
  const [sejours, setSejours] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('tous');
  const [form, setForm] = useState({ patient_id: '', staff_id: '', motif: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/sejours`).then(r => r.json()),
      fetch(`${API}/patients`).then(r => r.json()),
      fetch(`${API}/staff`).then(r => r.json()),
    ]).then(([s, p, st]) => {
      setSejours(s.sejours || []);
      setPatients(p.patients || []);
      setStaff(st.staff || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function submitSejour(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/sejours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('✅ Admission enregistrée');
      setForm({ patient_id: '', staff_id: '', motif: '' });
      setShowForm(false);
      const data = await fetch(`${API}/sejours`).then(r => r.json());
      setSejours(data.sejours || []);
    } catch {
      showToast('❌ Erreur lors de l\'admission');
    }
  }

  async function handleDischarge(id, nom) {
    if (!window.confirm(`Confirmer la sortie de ${nom} ?`)) return;
    try {
      await fetch(`${API}/sejours/${id}/discharge`, { method: 'PUT' });
      showToast('✅ Patient sorti');
      const data = await fetch(`${API}/sejours`).then(r => r.json());
      setSejours(data.sejours || []);
    } catch {
      showToast('❌ Erreur');
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = filter === 'tous' ? sejours : sejours.filter(s => s.statut === filter);
  const actifs  = sejours.filter(s => s.statut === 'actif').length;
  const sortis  = sejours.filter(s => s.statut === 'sorti').length;

  return (
    <>
      <div className="cards-grid">
        <div className="card">
          <div className="card-icon">🛏️</div>
          <div className="card-value">{actifs}</div>
          <div className="card-label">Séjours actifs</div>
        </div>
        <div className="card">
          <div className="card-icon">🚪</div>
          <div className="card-value" style={{ color: '#6b7280' }}>{sortis}</div>
          <div className="card-label">Patients sortis</div>
        </div>
        <div className="card">
          <div className="card-icon">📋</div>
          <div className="card-value">{sejours.length}</div>
          <div className="card-label">Total séjours</div>
        </div>
      </div>

      <div className="main">
        <div className="section">
          <div className="section-header">
            <h2>🛏️ Gestion des séjours</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, cursor: 'pointer' }}>
                <option value="tous">Tous</option>
                <option value="actif">Actifs</option>
                <option value="sorti">Sortis</option>
              </select>
              <button className="btn btn-primary" onClick={() => setShowForm(f => !f)}>
                {showForm ? '✕ Annuler' : '➕ Nouvelle admission'}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={submitSejour} style={{ marginBottom: 20 }}>
              <div className="form-box">
                <div className="form-row">
                  <div className="form-group">
                    <label>Patient *</label>
                    <select required value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                      <option value="">Sélectionner un patient</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.nom} — {p.age} ans</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Médecin référent</label>
                    <select value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}>
                      <option value="">Non assigné</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.nom} — {s.role}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Motif d'hospitalisation</label>
                    <input type="text" placeholder="Ex: Pneumonie, Fracture..." value={form.motif}
                      onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">💾 Enregistrer l'admission</button>
              </div>
            </form>
          )}

          {loading && <p className="empty">Chargement...</p>}
          {!loading && (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Médecin</th>
                  <th>Motif</th>
                  <th>Admission</th>
                  <th>Sortie</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty">Aucun séjour</td></tr>
                )}
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ background: COLORS[i % COLORS.length] }}>
                          {getInitials(s.patient_nom)}
                        </div>
                        <div>
                          <strong>{s.patient_nom}</strong>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.age} ans — {s.sexe === 'M' ? 'Homme' : 'Femme'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>{s.staff_nom || '—'}</td>
                    <td style={{ fontSize: 12, color: '#374151' }}>{s.motif || '—'}</td>
                    <td style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {new Date(s.admission_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {s.discharge_date ? new Date(s.discharge_date).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td>
                      <span className="badge" style={
                        s.statut === 'actif'
                          ? { background: '#dcfce7', color: '#166534' }
                          : { background: '#f3f4f6', color: '#6b7280' }
                      }>
                        {s.statut === 'actif' ? '🟢 Actif' : '⚫ Sorti'}
                      </span>
                    </td>
                    <td>
                      {s.statut === 'actif' && (
                        <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 10px' }}
                          onClick={() => handleDischarge(s.id, s.patient_nom)}>
                          🚪 Sortie
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
