import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '/api';

const ROLES = ['Médecin', 'Infirmier', 'Infirmière', 'Chirurgien', 'Radiologue', 'Pharmacien', 'Aide-soignant', 'Administrateur'];
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#e8b04b', '#14b8a6', '#ec4899'];

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
}

function getRoleBadgeStyle(role) {
  const map = {
    'Médecin':      { background: '#dbeafe', color: '#1d4ed8' },
    'Chirurgien':   { background: '#dbeafe', color: '#1d4ed8' },
    'Infirmier':    { background: '#dcfce7', color: '#166534' },
    'Infirmière':   { background: '#dcfce7', color: '#166534' },
    'Radiologue':   { background: '#fef9c3', color: '#854d0e' },
    'Pharmacien':   { background: '#ede9fe', color: '#6d28d9' },
    'Aide-soignant':{ background: '#fce7f3', color: '#9d174d' },
    'Administrateur':{ background: '#f3f4f6', color: '#374151' },
  };
  return map[role] || { background: '#f3f4f6', color: '#374151' };
}

export default function StaffDashboard() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nom: '', role: 'Médecin', email: '' });
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/staff`);
      const data = await res.json();
      setStaff(data.staff || []);
    } finally {
      setLoading(false);
    }
  }

  async function submitStaff(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast('✅ Personnel ajouté avec succès');
      setForm({ nom: '', role: 'Médecin', email: '' });
      setShowForm(false);
      fetchStaff();
    } catch {
      showToast('❌ Erreur lors de l\'ajout');
    }
  }

  async function handleDelete(id, nom) {
    if (!window.confirm(`Supprimer ${nom} ?`)) return;
    try {
      await fetch(`${API}/staff/${id}`, { method: 'DELETE' });
      showToast('🗑️ Personnel supprimé');
      fetchStaff();
    } catch {
      showToast('❌ Erreur lors de la suppression');
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const medecins   = staff.filter(s => s.role === 'Médecin' || s.role === 'Chirurgien' || s.role === 'Radiologue');
  const infirmiers = staff.filter(s => s.role === 'Infirmier' || s.role === 'Infirmière' || s.role === 'Aide-soignant');
  const autres     = staff.filter(s => !medecins.includes(s) && !infirmiers.includes(s));

  return (
    <>
      {/* KPI Cards */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-icon">👨‍⚕️</div>
          <div className="card-value">{staff.length}</div>
          <div className="card-label">Total Personnel</div>
        </div>
        <div className="card">
          <div className="card-icon">🩺</div>
          <div className="card-value" style={{ color: '#1d4ed8' }}>{medecins.length}</div>
          <div className="card-label">Médecins</div>
        </div>
        <div className="card">
          <div className="card-icon">💉</div>
          <div className="card-value" style={{ color: '#166534' }}>{infirmiers.length}</div>
          <div className="card-label">Infirmiers</div>
        </div>
        <div className="card">
          <div className="card-icon">🏥</div>
          <div className="card-value" style={{ color: '#6d28d9' }}>{autres.length}</div>
          <div className="card-label">Autres</div>
        </div>
      </div>

      <div className="main">
        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>👨‍⚕️ Personnel médical</h2>
            <button className="btn btn-primary" onClick={() => setShowForm(f => !f)}>
              {showForm ? '✕ Annuler' : '➕ Ajouter'}
            </button>
          </div>

          {/* Formulaire ajout */}
          {showForm && (
            <form onSubmit={submitStaff} style={{ marginBottom: 20, padding: 16, background: '#f8fafc', borderRadius: 10 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input type="text" required placeholder="Dr. Nom Prénom" value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Rôle *</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="email@safecare.dj" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">💾 Enregistrer</button>
            </form>
          )}

          {loading && <p className="empty">Chargement...</p>}

          {!loading && (
            <div className="table-wrap"><table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Email</th>
                  <th>Ajouté le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 && (
                  <tr><td colSpan={5} className="empty">Aucun personnel enregistré</td></tr>
                )}
                {staff.map((s, i) => {
                  const badgeStyle = getRoleBadgeStyle(s.role);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ background: COLORS[i % COLORS.length] }}>
                            {getInitials(s.nom)}
                          </div>
                          <strong>{s.nom}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={badgeStyle}>{s.role}</span>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: 12 }}>{s.email || '—'}</td>
                      <td style={{ color: '#9ca3af', fontSize: 11 }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td>
                        <button className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fecaca', padding: '5px 10px' }}
                          onClick={() => handleDelete(s.id, s.nom)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
