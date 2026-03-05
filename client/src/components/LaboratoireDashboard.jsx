import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = import.meta.env.VITE_API_URL || '/api';

const TYPES_ANALYSE = [
  'NFS (Numération Formule Sanguine)',
  'Biochimie sanguine',
  'Bilan rénal',
  'Bilan hépatique',
  'Bilan lipidique',
  'Glycémie / HbA1c',
  'Ionogramme',
  'Coagulation (TP, TCA)',
  'Groupage sanguin',
  'Hémoculture',
  'ECBU (Analyse d\'urine)',
  'Coproculture',
  'Sérologie',
  'Radiographie',
  'Échographie',
  'Scanner (TDM)',
  'IRM',
  'ECG',
  'Autre',
];

const PARAMETRES_PAR_TYPE = {
  'NFS (Numération Formule Sanguine)': [
    { parametre: 'Globules rouges', unite: 'T/L', valeur_normale: '4.5-5.5' },
    { parametre: 'Hémoglobine', unite: 'g/dL', valeur_normale: '12-16' },
    { parametre: 'Hématocrite', unite: '%', valeur_normale: '37-47' },
    { parametre: 'Globules blancs', unite: 'G/L', valeur_normale: '4.0-10.0' },
    { parametre: 'Plaquettes', unite: 'G/L', valeur_normale: '150-400' },
  ],
  'Biochimie sanguine': [
    { parametre: 'Glucose', unite: 'mmol/L', valeur_normale: '3.9-5.6' },
    { parametre: 'Protéines totales', unite: 'g/L', valeur_normale: '65-85' },
    { parametre: 'Albumine', unite: 'g/L', valeur_normale: '35-50' },
    { parametre: 'Créatinine', unite: 'µmol/L', valeur_normale: '60-110' },
    { parametre: 'Urée', unite: 'mmol/L', valeur_normale: '2.5-7.5' },
  ],
  'Bilan hépatique': [
    { parametre: 'ASAT (GOT)', unite: 'UI/L', valeur_normale: '<40' },
    { parametre: 'ALAT (GPT)', unite: 'UI/L', valeur_normale: '<41' },
    { parametre: 'GGT', unite: 'UI/L', valeur_normale: '<55' },
    { parametre: 'Bilirubine totale', unite: 'µmol/L', valeur_normale: '5-17' },
    { parametre: 'Phosphatases alcalines', unite: 'UI/L', valeur_normale: '40-130' },
  ],
  'Bilan lipidique': [
    { parametre: 'Cholestérol total', unite: 'mmol/L', valeur_normale: '<5.2' },
    { parametre: 'LDL', unite: 'mmol/L', valeur_normale: '<3.4' },
    { parametre: 'HDL', unite: 'mmol/L', valeur_normale: '>1.0' },
    { parametre: 'Triglycérides', unite: 'mmol/L', valeur_normale: '<1.7' },
  ],
};

const STATUTS = {
  prescrit: { label: 'Prescrit', color: '#3b82f6', bg: '#dbeafe' },
  en_cours: { label: 'En cours', color: '#f59e0b', bg: '#fef9c3' },
  disponible: { label: 'Résultat disponible', color: '#10b981', bg: '#dcfce7' },
  valide: { label: 'Validé', color: '#6b7280', bg: '#f3f4f6' },
};

const RESULT_STATUTS = {
  normal: { label: 'Normal', color: '#10b981', bg: '#dcfce7' },
  anormal: { label: 'Anormal', color: '#f59e0b', bg: '#fef9c3' },
  critique: { label: 'CRITIQUE', color: '#ef4444', bg: '#fee2e2' },
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
function fmtDateHeure(d) { return d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

export default function LaboratoireDashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState({});
  const [view, setView] = useState('list'); // list | create | detail
  const [selected, setSelected] = useState(null);
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterUrgence, setFilterUrgence] = useState('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [newAnalyse, setNewAnalyse] = useState({
    patient_id: '', medecin_id: '', type_analyse: TYPES_ANALYSE[0], urgence: false, notes: ''
  });
  const [newResultat, setNewResultat] = useState({
    parametre: '', valeur: '', unite: '', valeur_normale: '', statut_resultat: 'normal'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [a, p, s, st] = await Promise.all([
        fetch(`${API}/analyses`).then(r => r.json()),
        fetch(`${API}/patients`).then(r => r.json()),
        fetch(`${API}/staff`).then(r => r.json()),
        fetch(`${API}/labo/stats`).then(r => r.json()),
      ]);
      setAnalyses(a.analyses || []);
      setPatients(p.patients || []);
      setStaff(s.staff || []);
      setStats(st || {});
    } catch (_) {}
    setLoading(false);
  }

  async function openDetail(id) {
    const r = await fetch(`${API}/analyses/${id}`);
    const d = await r.json();
    setSelected(d.analyse);
    setView('detail');
    // Pre-fill parametres if type has predefined ones
    const predef = PARAMETRES_PAR_TYPE[d.analyse?.type_analyse];
    if (predef && d.analyse?.resultats?.length === 0) {
      setNewResultat({ ...newResultat, parametre: predef[0]?.parametre || '', unite: predef[0]?.unite || '', valeur_normale: predef[0]?.valeur_normale || '' });
    }
  }

  async function handleCreate() {
    if (!newAnalyse.patient_id || !newAnalyse.type_analyse) return showToast('Remplissez les champs obligatoires');
    setSaving(true);
    const r = await fetch(`${API}/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnalyse),
    });
    const d = await r.json();
    setSaving(false);
    showToast('Analyse prescrite avec succès');
    setNewAnalyse({ patient_id: '', medecin_id: '', type_analyse: TYPES_ANALYSE[0], urgence: false, notes: '' });
    await loadAll();
    openDetail(d.analyse.id);
  }

  async function handleChangeStatut(id, statut) {
    await fetch(`${API}/analyses/${id}/statut`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    await openDetail(id);
    loadAll();
    showToast('Statut mis à jour');
  }

  async function handleAddResultat(analyse_id) {
    if (!newResultat.parametre || !newResultat.valeur) return showToast('Paramètre et valeur obligatoires');
    await fetch(`${API}/analyses/${analyse_id}/resultats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResultat),
    });
    const predef = PARAMETRES_PAR_TYPE[selected?.type_analyse];
    const currentIdx = predef?.findIndex(p => p.parametre === newResultat.parametre) ?? -1;
    const next = predef?.[currentIdx + 1];
    setNewResultat({
      parametre: next?.parametre || '',
      valeur: '',
      unite: next?.unite || '',
      valeur_normale: next?.valeur_normale || '',
      statut_resultat: 'normal',
    });
    await openDetail(analyse_id);
    loadAll();
    showToast('Résultat enregistré');
  }

  function handleSelectParametre(e) {
    const val = e.target.value;
    const predef = PARAMETRES_PAR_TYPE[selected?.type_analyse] || [];
    const found = predef.find(p => p.parametre === val);
    setNewResultat({
      ...newResultat,
      parametre: val,
      unite: found?.unite || '',
      valeur_normale: found?.valeur_normale || '',
    });
  }

  function exportPDF(analyse) {
    const doc = new jsPDF();
    doc.setFillColor(15, 80, 50);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('KAYAN CLINIQUE', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Laboratoire d\'Analyses Médicales — Djibouti', 14, 24);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPTE-RENDU D\'ANALYSES', 120, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${fmtDate(analyse.date_realisation || analyse.date_prescription)}`, 120, 24);

    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT', 14, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`${analyse.patient_nom} — ${analyse.age} ans — ${analyse.sexe === 'M' ? 'Masculin' : 'Féminin'}`, 14, 60);
    doc.setFont('helvetica', 'bold');
    doc.text('TYPE D\'EXAMEN', 14, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(analyse.type_analyse, 14, 80);
    if (analyse.medecin_nom) {
      doc.text(`Prescrit par: ${analyse.medecin_nom}`, 14, 88);
    }
    if (analyse.urgence) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠ URGENT', 160, 60);
      doc.setTextColor(0);
    }

    autoTable(doc, {
      startY: 98,
      head: [['Paramètre', 'Valeur', 'Unité', 'Valeur normale', 'Interprétation']],
      body: (analyse.resultats || []).map(r => [
        r.parametre,
        r.valeur,
        r.unite || '',
        r.valeur_normale || '',
        (RESULT_STATUTS[r.statut_resultat]?.label || r.statut_resultat).toUpperCase(),
      ]),
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [15, 80, 50], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        4: {
          fontStyle: 'bold',
          textColor: (cell) => cell.raw === 'CRITIQUE' ? [220, 38, 38] : [0, 0, 0],
        },
      },
    });

    const y = doc.lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Ce document est à conserver dans le dossier médical du patient.', 14, y);
    doc.text('Kayan Clinique — Djibouti', 14, y + 8);

    doc.save(`analyse-${analyse.id}-${analyse.patient_nom}.pdf`);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const predefParams = PARAMETRES_PAR_TYPE[selected?.type_analyse] || [];
  const hasCritique = (selected?.resultats || []).some(r => r.statut_resultat === 'critique');

  const filtered = analyses.filter(a => {
    if (filterStatut !== 'all' && a.statut !== filterStatut) return false;
    if (filterUrgence === 'urgent' && !a.urgence) return false;
    if (search && !a.patient_nom?.toLowerCase().includes(search.toLowerCase()) &&
        !a.type_analyse?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const medecins = staff.filter(s => ['Médecin', 'Chirurgien', 'Radiologue'].includes(s.role));

  return (
    <div className="main">
      {toast && <div className="toast">{toast}</div>}

      {/* KPI Cards */}
      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-icon">🔬</div>
          <div className="card-value" style={{ color: '#3b82f6' }}>{stats.prescrites || 0}</div>
          <div className="card-label">Prescrites</div>
        </div>
        <div className="card">
          <div className="card-icon">⚙️</div>
          <div className="card-value" style={{ color: '#f59e0b' }}>{stats.en_cours || 0}</div>
          <div className="card-label">En cours</div>
        </div>
        <div className="card">
          <div className="card-icon">✅</div>
          <div className="card-value" style={{ color: '#10b981' }}>{stats.disponibles || 0}</div>
          <div className="card-label">Résultats disponibles</div>
        </div>
        <div className="card" style={{ border: stats.critiques > 0 ? '1px solid #fecaca' : undefined }}>
          <div className="card-icon">🚨</div>
          <div className="card-value" style={{ color: '#ef4444' }}>{stats.critiques || 0}</div>
          <div className="card-label">Résultats critiques</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>
            {view === 'list' && '🔬 Analyses & Laboratoire'}
            {view === 'create' && '➕ Prescrire une analyse'}
            {view === 'detail' && selected && (
              <span>
                {selected.type_analyse}
                {selected.urgence && <span style={{ background: '#fee2e2', color: '#ef4444', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, marginLeft: 10 }}>URGENT</span>}
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {view !== 'list' && (
              <button className="btn btn-outline" onClick={() => setView('list')}>← Retour</button>
            )}
            {view === 'list' && (
              <button className="btn btn-primary" onClick={() => setView('create')}>+ Prescrire une analyse</button>
            )}
            {view === 'detail' && selected && (
              <>
                {(selected.resultats || []).length > 0 && (
                  <button className="btn btn-outline" onClick={() => exportPDF(selected)}>📄 Compte-rendu PDF</button>
                )}
                {selected.statut === 'prescrit' && (
                  <button className="btn btn-primary" onClick={() => handleChangeStatut(selected.id, 'en_cours')}>▶ Démarrer l'analyse</button>
                )}
                {selected.statut === 'disponible' && (
                  <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={() => handleChangeStatut(selected.id, 'valide')}>✓ Valider les résultats</button>
                )}
              </>
            )}
          </div>
        </div>

        {/* === LIST VIEW === */}
        {view === 'list' && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                placeholder="Rechercher par patient ou type d'analyse..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}
              />
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}>
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={filterUrgence} onChange={e => setFilterUrgence(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}>
                <option value="all">Toutes</option>
                <option value="urgent">Urgentes seulement</option>
              </select>
            </div>
            {loading ? <div className="empty">Chargement...</div> : filtered.length === 0 ? (
              <div className="empty">Aucune analyse trouvée</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Type d'analyse</th>
                    <th>Patient</th>
                    <th>Médecin prescripteur</th>
                    <th>Prescrit le</th>
                    <th>Réalisé le</th>
                    <th>Urgence</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const st = STATUTS[a.statut] || STATUTS.prescrit;
                    return (
                      <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(a.id)}>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{a.type_analyse}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar" style={{ background: '#0f766e', width: 30, height: 30, fontSize: 11 }}>
                              {a.patient_nom?.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{a.patient_nom}</span>
                          </div>
                        </td>
                        <td style={{ color: '#6b7280' }}>{a.medecin_nom || '—'}</td>
                        <td>{fmtDateHeure(a.date_prescription)}</td>
                        <td>{fmtDateHeure(a.date_realisation)}</td>
                        <td>
                          {a.urgence && (
                            <span className="badge" style={{ background: '#fee2e2', color: '#ef4444' }}>🚨 URGENT</span>
                          )}
                        </td>
                        <td>
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => openDetail(a.id)}>Voir</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* === CREATE VIEW === */}
        {view === 'create' && (
          <div style={{ maxWidth: 600 }}>
            <div className="form-box">
              <div className="form-row">
                <div className="form-group">
                  <label>Patient *</label>
                  <select value={newAnalyse.patient_id}
                    onChange={e => setNewAnalyse({ ...newAnalyse, patient_id: e.target.value })}>
                    <option value="">Sélectionner un patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.nom} ({p.age} ans)</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Médecin prescripteur</label>
                  <select value={newAnalyse.medecin_id}
                    onChange={e => setNewAnalyse({ ...newAnalyse, medecin_id: e.target.value })}>
                    <option value="">— Sélectionner —</option>
                    {medecins.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Type d'analyse *</label>
                  <select value={newAnalyse.type_analyse}
                    onChange={e => setNewAnalyse({ ...newAnalyse, type_analyse: e.target.value })}>
                    {TYPES_ANALYSE.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Notes cliniques</label>
                  <input placeholder="Motif, contexte clinique, instructions particulières..."
                    value={newAnalyse.notes} onChange={e => setNewAnalyse({ ...newAnalyse, notes: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <input type="checkbox" id="urgence" checked={newAnalyse.urgence}
                  onChange={e => setNewAnalyse({ ...newAnalyse, urgence: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="urgence" style={{ cursor: 'pointer', fontWeight: 600, color: '#dc2626', fontSize: 13 }}>
                  🚨 Marquer comme URGENT
                </label>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Prescription en cours...' : '🔬 Prescrire l\'analyse'}
            </button>
          </div>
        )}

        {/* === DETAIL VIEW === */}
        {view === 'detail' && selected && (
          <div>
            {/* Alerte critique */}
            {hasCritique && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>🚨</span>
                <div>
                  <strong style={{ color: '#dc2626' }}>Résultat(s) critique(s) détecté(s)</strong>
                  <div style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>
                    Prise en charge médicale immédiate recommandée
                  </div>
                </div>
              </div>
            )}

            {/* Infos de l'analyse */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>PATIENT</div>
                <div style={{ fontWeight: 700 }}>{selected.patient_nom}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{selected.age} ans — {selected.sexe === 'M' ? 'M' : 'F'}</div>
              </div>
              <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>PRESCRIPTEUR</div>
                <div style={{ fontWeight: 700 }}>{selected.medecin_nom || '—'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{fmtDateHeure(selected.date_prescription)}</div>
              </div>
              <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>STATUT</div>
                <span className="badge" style={{
                  background: STATUTS[selected.statut]?.bg,
                  color: STATUTS[selected.statut]?.color,
                  fontSize: 12, padding: '4px 12px',
                }}>
                  {STATUTS[selected.statut]?.label}
                </span>
                {selected.urgence && <div style={{ marginTop: 6 }}><span className="badge" style={{ background: '#fee2e2', color: '#ef4444' }}>🚨 URGENT</span></div>}
              </div>
            </div>

            {selected.notes && (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#713f12' }}>
                <strong>Notes :</strong> {selected.notes}
              </div>
            )}

            {/* Résultats */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f766e', marginBottom: 12 }}>Résultats d'analyses</h3>

              {(selected.resultats || []).length === 0 ? (
                <div className="empty" style={{ padding: '20px 0' }}>
                  Aucun résultat saisi — utilisez le formulaire ci-dessous
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Paramètre</th>
                      <th>Valeur</th>
                      <th>Unité</th>
                      <th>Valeur normale</th>
                      <th>Interprétation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.resultats.map(r => {
                      const rs = RESULT_STATUTS[r.statut_resultat] || RESULT_STATUTS.normal;
                      return (
                        <tr key={r.id} style={{ background: r.statut_resultat === 'critique' ? '#fff1f2' : undefined }}>
                          <td style={{ fontWeight: 600 }}>{r.parametre}</td>
                          <td>
                            <strong style={{ fontSize: 15, color: r.statut_resultat === 'critique' ? '#ef4444' : r.statut_resultat === 'anormal' ? '#f59e0b' : '#111827' }}>
                              {r.valeur}
                            </strong>
                          </td>
                          <td style={{ color: '#6b7280' }}>{r.unite || '—'}</td>
                          <td style={{ color: '#6b7280', fontSize: 12 }}>{r.valeur_normale || '—'}</td>
                          <td>
                            <span className="badge" style={{ background: rs.bg, color: rs.color, fontWeight: 700 }}>
                              {rs.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {selected.statut !== 'valide' && (
                <div className="form-box" style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>+ Saisir un résultat</div>
                  <div className="form-row">
                    <div className="form-group" style={{ gridColumn: predefParams.length > 0 ? 'auto' : 'span 2' }}>
                      <label>Paramètre *</label>
                      {predefParams.length > 0 ? (
                        <select value={newResultat.parametre} onChange={handleSelectParametre}>
                          <option value="">— Sélectionner —</option>
                          {predefParams.map(p => <option key={p.parametre} value={p.parametre}>{p.parametre}</option>)}
                          <option value="_autre">Autre paramètre...</option>
                        </select>
                      ) : (
                        <input placeholder="Ex: Créatinine" value={newResultat.parametre}
                          onChange={e => setNewResultat({ ...newResultat, parametre: e.target.value })} />
                      )}
                    </div>
                    {newResultat.parametre === '_autre' && (
                      <div className="form-group">
                        <label>Nom du paramètre</label>
                        <input placeholder="Entrez le paramètre" value={newResultat._autreParam || ''}
                          onChange={e => setNewResultat({ ...newResultat, _autreParam: e.target.value, parametre: e.target.value })} />
                      </div>
                    )}
                    <div className="form-group">
                      <label>Valeur *</label>
                      <input placeholder="Ex: 7.2" value={newResultat.valeur}
                        onChange={e => setNewResultat({ ...newResultat, valeur: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Unité</label>
                      <input placeholder="Ex: mmol/L" value={newResultat.unite}
                        onChange={e => setNewResultat({ ...newResultat, unite: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Valeur normale</label>
                      <input placeholder="Ex: 3.9-5.6" value={newResultat.valeur_normale}
                        onChange={e => setNewResultat({ ...newResultat, valeur_normale: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Interprétation</label>
                      <select value={newResultat.statut_resultat}
                        onChange={e => setNewResultat({ ...newResultat, statut_resultat: e.target.value })}>
                        <option value="normal">Normal</option>
                        <option value="anormal">Anormal</option>
                        <option value="critique">Critique</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary" style={{ background: '#0f766e' }}
                      onClick={() => handleAddResultat(selected.id)}>Enregistrer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
