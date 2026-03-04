import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#e8b04b', '#14b8a6', '#ec4899'];

function getRiskBadge(label) {
  if (!label) return null;
  const cls = label === 'Faible risque' ? 'badge-low' : label === 'Risque moyen' ? 'badge-medium' : 'badge-high';
  return <span className={`badge ${cls}`}>{label}</span>;
}
function getScoreColor(score) {
  if (score === null || score === undefined) return '#9ca3af';
  if (score <= 4) return '#16a34a';
  if (score <= 6) return '#d97706';
  return '#dc2626';
}
function getInitials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
}

const emptyPatient = { nom: '', age: '', sexe: 'M', telephone: '', adresse: '' };

export default function VitalsDashboard({ occupancy, alerts = [] }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('tous');
  const [tab, setTab] = useState('vitals'); // 'vitals' | 'graph' | 'form'
  const [vitalsForm, setVitalsForm] = useState({
    sejour_id: '', temperature: '', heart_rate: '',
    blood_pressure: '', respiratory_rate: '',
    spo2: '', consciousness: 'A', oxygen_supplement: false,
  });
  // CRUD patient
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchPatients(); }, []);

  async function fetchPatients() {
    try {
      setLoading(true);
      const res = await fetch(`${API}/patients`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {
      setError('Impossible de contacter le serveur API.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchVitals(patientId) {
    const res = await fetch(`${API}/patients/${patientId}/vitals`);
    const data = await res.json();
    setVitals(data.vitals || []);
  }

  function selectPatient(p) {
    setSelected(p);
    fetchVitals(p.id);
    setTab('vitals');
  }

  // CRUD
  function openAddPatient() {
    setEditPatient(null);
    setPatientForm(emptyPatient);
    setShowPatientForm(true);
  }

  function openEditPatient(p) {
    setEditPatient(p);
    setPatientForm({ nom: p.nom, age: p.age, sexe: p.sexe, telephone: p.telephone || '', adresse: p.adresse || '' });
    setShowPatientForm(true);
  }

  async function submitPatient(e) {
    e.preventDefault();
    try {
      const url = editPatient ? `${API}/patients/${editPatient.id}` : `${API}/patients`;
      const method = editPatient ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientForm, age: parseInt(patientForm.age) }),
      });
      if (!res.ok) throw new Error();
      showToast(editPatient ? '✅ Patient modifié' : '✅ Patient ajouté');
      setShowPatientForm(false);
      fetchPatients();
    } catch {
      showToast('❌ Erreur');
    }
  }

  async function handleDeletePatient(p) {
    if (!window.confirm(`Supprimer ${p.nom} ? Cette action est irréversible.`)) return;
    try {
      await fetch(`${API}/patients/${p.id}`, { method: 'DELETE' });
      showToast('🗑️ Patient supprimé');
      if (selected?.id === p.id) setSelected(null);
      fetchPatients();
    } catch {
      showToast('❌ Erreur');
    }
  }

  async function submitVitals(e) {
    e.preventDefault();
    try {
      const body = {
        ...vitalsForm,
        temperature:      parseFloat(vitalsForm.temperature) || null,
        heart_rate:       parseInt(vitalsForm.heart_rate) || null,
        respiratory_rate: parseInt(vitalsForm.respiratory_rate) || null,
        spo2:             parseInt(vitalsForm.spo2) || null,
      };
      const res = await fetch(`${API}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      showToast(`Score NEWS2 : ${data.news2Score} — ${data.riskLabel}`);
      fetchVitals(selected.id);
      fetchPatients();
      setTab('vitals');
    } catch {
      showToast('❌ Erreur lors de l\'enregistrement.');
    }
  }

  // Export PDF
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(30, 58, 95);
    doc.text('Kayan Clinique — Rapport Patient', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Patient : ${selected.nom}`, 14, 32);
    doc.text(`Âge : ${selected.age} ans  |  Sexe : ${selected.sexe === 'M' ? 'Homme' : 'Femme'}`, 14, 40);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 14, 48);
    if (vitals.length > 0) {
      autoTable(doc, {
        startY: 58,
        head: [['Date', 'Temp.', 'FC', 'PA', 'FR', 'SpO2', 'NEWS2', 'Risque']],
        body: vitals.map(v => [
          new Date(v.recorded_at).toLocaleString('fr-FR'),
          v.temperature ? `${v.temperature}°C` : '—',
          v.heart_rate || '—',
          v.blood_pressure || '—',
          v.respiratory_rate || '—',
          v.spo2 ? `${v.spo2}%` : '—',
          v.news2_score ?? '—',
          v.risk_label || '—',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 58, 95] },
      });
    }
    doc.save(`KayanClinique_${selected.nom.replace(/\s/g, '_')}.pdf`);
    showToast('📄 PDF exporté');
  }

  // Impression ordonnance
  function printOrdonnance() {
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Ordonnance — ${selected.nom}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
        h1 { color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .info { margin: 20px 0; }
        .label { font-size: 12px; color: #6b7280; }
        .value { font-size: 14px; font-weight: bold; }
        .vitals { margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
        th { background: #1e3a5f; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
        .footer { margin-top: 60px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af; }
      </style></head><body>
      <h1>🏥 Kayan Clinique — Fiche Patient</h1>
      <div class="info">
        <div class="label">Nom complet</div><div class="value">${selected.nom}</div>
        <div class="label" style="margin-top:10px">Âge</div><div class="value">${selected.age} ans</div>
        <div class="label" style="margin-top:10px">Sexe</div><div class="value">${selected.sexe === 'M' ? 'Masculin' : 'Féminin'}</div>
        <div class="label" style="margin-top:10px">Dernier score NEWS2</div>
        <div class="value" style="color:${getScoreColor(selected.last_news2)}">${selected.last_news2 ?? 'Non évalué'} — ${selected.last_risk || ''}</div>
      </div>
      <div class="vitals">
        <strong>Historique des signes vitaux :</strong>
        <table>
          <tr><th>Date</th><th>Temp.</th><th>FC</th><th>PA</th><th>SpO2</th><th>NEWS2</th></tr>
          ${vitals.slice(0, 10).map(v => `
            <tr>
              <td>${new Date(v.recorded_at).toLocaleString('fr-FR')}</td>
              <td>${v.temperature ?? '—'}°C</td>
              <td>${v.heart_rate ?? '—'}</td>
              <td>${v.blood_pressure || '—'}</td>
              <td>${v.spo2 ?? '—'}%</td>
              <td><strong>${v.news2_score ?? '—'}</strong></td>
            </tr>`).join('')}
        </table>
      </div>
      <div class="footer">Généré le ${new Date().toLocaleString('fr-FR')} — Kayan Clinique SIH</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  // Données graphique
  const chartData = [...vitals].reverse().slice(-15).map(v => ({
    date: new Date(v.recorded_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    'Temp.': v.temperature,
    'FC': v.heart_rate,
    'SpO2': v.spo2,
    'NEWS2': v.news2_score,
  }));

  // Filtres
  const filtered = patients.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase());
    const matchRisk =
      riskFilter === 'tous' ? true :
      riskFilter === 'eleve' ? p.last_risk === 'Risque élevé' :
      riskFilter === 'moyen' ? p.last_risk === 'Risque moyen' :
      riskFilter === 'faible' ? p.last_risk === 'Faible risque' : true;
    return matchSearch && matchRisk;
  });

  const stats = {
    total:  patients.length,
    high:   patients.filter(p => p.last_risk === 'Risque élevé').length,
    medium: patients.filter(p => p.last_risk === 'Risque moyen').length,
    low:    patients.filter(p => p.last_risk === 'Faible risque').length,
  };
  const occPct = occupancy ? Math.round((occupancy.occupied / occupancy.total) * 100) : 0;
  const occColor = occPct >= 90 ? '#dc2626' : occPct >= 70 ? '#d97706' : '#16a34a';

  return (
    <>
      {/* KPI Cards */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-icon">👥</div>
          <div className="card-value">{stats.total}</div>
          <div className="card-label">Patients</div>
        </div>
        <div className="card">
          <div className="card-icon">🔴</div>
          <div className="card-value" style={{ color: '#dc2626' }}>{stats.high}</div>
          <div className="card-label">Risque élevé</div>
        </div>
        <div className="card">
          <div className="card-icon">🟡</div>
          <div className="card-value" style={{ color: '#d97706' }}>{stats.medium}</div>
          <div className="card-label">Risque moyen</div>
        </div>
        <div className="card">
          <div className="card-icon">🟢</div>
          <div className="card-value" style={{ color: '#16a34a' }}>{stats.low}</div>
          <div className="card-label">Faible risque</div>
        </div>
        {occupancy && (
          <div className="card">
            <div className="card-icon">🛏️</div>
            <div className="card-value" style={{ color: occColor }}>
              {occupancy.occupied}<span style={{ fontSize: 16, color: '#9ca3af' }}>/{occupancy.total}</span>
            </div>
            <div className="card-label">Lits occupés ({occPct}%)</div>
            <div className="occ-bar-bg">
              <div className="occ-bar-fill" style={{ width: `${occPct}%`, background: occColor }} />
            </div>
          </div>
        )}
      </div>

      <div className="main">
        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="alerts-section">
            <h2>🚨 Alertes d'urgence</h2>
            {alerts.map((a, i) => (
              <div className="alert-item" key={i}>
                <div className="alert-score">{a.news2_score}</div>
                <div className="alert-info">
                  <div className="alert-name">{a.nom}, {a.age} ans</div>
                  <div className="alert-time">{new Date(a.recorded_at).toLocaleString('fr-FR')}</div>
                </div>
                <span className="badge badge-high">{a.risk_label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire patient (add/edit) */}
        {showPatientForm && (
          <div className="section" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="section-header">
              <h2>{editPatient ? '✏️ Modifier le patient' : '➕ Nouveau patient'}</h2>
              <button className="btn btn-outline" onClick={() => setShowPatientForm(false)}>✕</button>
            </div>
            <form onSubmit={submitPatient}>
              <div className="form-box">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nom complet *</label>
                    <input required placeholder="Prénom Nom" value={patientForm.nom}
                      onChange={e => setPatientForm(f => ({ ...f, nom: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Âge *</label>
                    <input required type="number" min="0" max="150" placeholder="45" value={patientForm.age}
                      onChange={e => setPatientForm(f => ({ ...f, age: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Sexe *</label>
                    <select value={patientForm.sexe} onChange={e => setPatientForm(f => ({ ...f, sexe: e.target.value }))}>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input placeholder="77 000 000" value={patientForm.telephone}
                      onChange={e => setPatientForm(f => ({ ...f, telephone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Adresse</label>
                    <input placeholder="Djibouti-ville" value={patientForm.adresse}
                      onChange={e => setPatientForm(f => ({ ...f, adresse: e.target.value }))} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  💾 {editPatient ? 'Enregistrer les modifications' : 'Ajouter le patient'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* Liste patients */}
          <div className="section">
            <div className="section-header">
              <h2>📋 Patients</h2>
              <button className="btn btn-primary" onClick={openAddPatient}>➕ Ajouter</button>
            </div>

            {/* Recherche & filtres */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="🔍 Rechercher un patient..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none',
                }}
              />
              <select
                value={riskFilter}
                onChange={e => setRiskFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}>
                <option value="tous">Tous les risques</option>
                <option value="eleve">🔴 Risque élevé</option>
                <option value="moyen">🟡 Risque moyen</option>
                <option value="faible">🟢 Faible risque</option>
              </select>
            </div>

            {loading && <p className="empty">Chargement...</p>}
            {error   && <p className="empty" style={{ color: '#dc2626' }}>{error}</p>}
            {!loading && !error && (
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Âge</th>
                    <th style={{ textAlign: 'center' }}>NEWS2</th>
                    <th>Risque</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="empty">Aucun résultat</td></tr>
                  )}
                  {filtered.map((p, i) => (
                    <tr key={p.id}
                      className={selected?.id === p.id ? 'row-selected' : ''}
                      onClick={() => selectPatient(p)}
                      style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ background: COLORS[i % COLORS.length] }}>
                            {getInitials(p.nom)}
                          </div>
                          <strong>{p.nom}</strong>
                        </div>
                      </td>
                      <td style={{ color: '#6b7280' }}>{p.age} ans</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.last_news2 !== null && p.last_news2 !== undefined
                          ? <div className="score-circle" style={{ background: getScoreColor(p.last_news2) }}>{p.last_news2}</div>
                          : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td>{getRiskBadge(p.last_risk)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={() => openEditPatient(p)}>✏️</button>
                          <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={() => handleDeletePatient(p)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Panneau patient sélectionné */}
          {selected && (
            <div className="section">
              <div className="section-header">
                <h2>📋 {selected.nom}</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }} onClick={exportPDF}>📄 PDF</button>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: '6px 10px' }} onClick={printOrdonnance}>🖨️</button>
                  <button className="btn btn-outline" onClick={() => { setSelected(null); }}>✕</button>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #f0f2f5', paddingBottom: 12 }}>
                {[['vitals', '📊 Vitaux'], ['form', '➕ Saisir'], ['graph', '📈 Graphique']].map(([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: tab === key ? '#2563eb' : '#f3f4f6',
                      color: tab === key ? 'white' : '#374151',
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Historique vitaux */}
              {tab === 'vitals' && (
                vitals.length === 0
                  ? <p className="empty">Aucun relevé enregistré</p>
                  : <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th><th>Temp.</th><th>FC</th><th>PA</th><th>SpO2</th>
                          <th style={{ textAlign: 'center' }}>NEWS2</th><th>Risque</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vitals.map(v => (
                          <tr key={v.id}>
                            <td style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                              {new Date(v.recorded_at).toLocaleString('fr-FR')}
                            </td>
                            <td>{v.temperature ?? '—'}°C</td>
                            <td>{v.heart_rate ?? '—'}</td>
                            <td>{v.blood_pressure || '—'}</td>
                            <td>{v.spo2 ?? '—'}%</td>
                            <td style={{ textAlign: 'center' }}>
                              <div className="score-circle" style={{ background: getScoreColor(v.news2_score), width: 34, height: 34, fontSize: 13 }}>
                                {v.news2_score ?? '—'}
                              </div>
                            </td>
                            <td>{getRiskBadge(v.risk_label)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              )}

              {/* Formulaire saisie vitaux */}
              {tab === 'form' && (
                <form onSubmit={submitVitals}>
                  <div className="form-box">
                    <div className="form-row">
                      <div className="form-group">
                        <label>N° Séjour *</label>
                        <input type="number" required placeholder="ID séjour" value={vitalsForm.sejour_id}
                          onChange={e => setVitalsForm(f => ({ ...f, sejour_id: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Température (°C)</label>
                        <input type="number" step="0.1" placeholder="37.0" value={vitalsForm.temperature}
                          onChange={e => setVitalsForm(f => ({ ...f, temperature: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Fréq. cardiaque</label>
                        <input type="number" placeholder="75" value={vitalsForm.heart_rate}
                          onChange={e => setVitalsForm(f => ({ ...f, heart_rate: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Pression artérielle</label>
                        <input type="text" placeholder="120/80" value={vitalsForm.blood_pressure}
                          onChange={e => setVitalsForm(f => ({ ...f, blood_pressure: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Fréq. respiratoire</label>
                        <input type="number" placeholder="16" value={vitalsForm.respiratory_rate}
                          onChange={e => setVitalsForm(f => ({ ...f, respiratory_rate: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>SpO2 (%)</label>
                        <input type="number" placeholder="98" value={vitalsForm.spo2}
                          onChange={e => setVitalsForm(f => ({ ...f, spo2: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Conscience (AVPU)</label>
                        <select value={vitalsForm.consciousness} onChange={e => setVitalsForm(f => ({ ...f, consciousness: e.target.value }))}>
                          <option value="A">A — Alerte</option>
                          <option value="V">V — Voix</option>
                          <option value="P">P — Douleur</option>
                          <option value="U">U — Inconscient</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                        <label>Oxygène suppl.</label>
                        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                          <input type="checkbox" checked={vitalsForm.oxygen_supplement}
                            onChange={e => setVitalsForm(f => ({ ...f, oxygen_supplement: e.target.checked }))} />
                          Oui
                        </label>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary">💾 Enregistrer & Calculer NEWS2</button>
                  </div>
                </form>
              )}

              {/* Graphique */}
              {tab === 'graph' && (
                chartData.length === 0
                  ? <p className="empty">Pas assez de données pour afficher un graphique</p>
                  : <div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Évolution des signes vitaux (15 derniers relevés)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="FC" stroke="#ef4444" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="SpO2" stroke="#3b82f6" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="NEWS2" stroke="#8b5cf6" dot={false} strokeWidth={2} strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                    <ResponsiveContainer width="100%" height={160} style={{ marginTop: 16 }}>
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[35, 42]} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Temp." stroke="#f97316" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
