import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = import.meta.env.VITE_API_URL || '/api';

const CATEGORIES = ['Consultation', 'Médicament', 'Examen', 'Chambre', 'Laboratoire', 'Chirurgie', 'Radiologie', 'Autre'];
const MODES_PAIEMENT = ['Espèces', 'Carte bancaire', 'Virement', 'Assurance', 'Chèque'];
const STATUTS = { brouillon: '#94a3b8', emise: '#3b82f6', payee: '#10b981', partielle: '#f59e0b', annulee: '#ef4444' };
const STATUTS_LABELS = { brouillon: 'Brouillon', emise: 'Émise', payee: 'Payée', partielle: 'Partielle', annulee: 'Annulée' };

function fmt(n) { return Number(n || 0).toLocaleString('fr-FR') + ' DJF'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }

export default function FacturationDashboard() {
  const [factures, setFactures] = useState([]);
  const [patients, setPatients] = useState([]);
  const [sejours, setSejours] = useState([]);
  const [stats, setStats] = useState({});
  const [view, setView] = useState('list'); // list | create | detail
  const [selected, setSelected] = useState(null);
  const [filterStatut, setFilterStatut] = useState('all');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // Form states
  const [newFac, setNewFac] = useState({ patient_id: '', sejour_id: '', date_echeance: '', notes: '' });
  const [newLigne, setNewLigne] = useState({ description: '', categorie: 'Consultation', quantite: 1, prix_unitaire: '' });
  const [newPmt, setNewPmt] = useState({ montant: '', mode_paiement: 'Espèces', reference: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [f, p, s, st] = await Promise.all([
        fetch(`${API}/factures`).then(r => r.json()),
        fetch(`${API}/patients`).then(r => r.json()),
        fetch(`${API}/sejours`).then(r => r.json()),
        fetch(`${API}/facturation/stats`).then(r => r.json()),
      ]);
      setFactures(f.factures || []);
      setPatients(p.patients || []);
      setSejours(s.sejours || []);
      setStats(st || {});
    } catch (_) {}
    setLoading(false);
  }

  async function openDetail(id) {
    const r = await fetch(`${API}/factures/${id}`);
    const d = await r.json();
    setSelected(d.facture);
    setView('detail');
  }

  async function handleCreateFacture() {
    if (!newFac.patient_id) return showToast('Sélectionnez un patient');
    setSaving(true);
    const r = await fetch(`${API}/factures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFac),
    });
    const d = await r.json();
    setSaving(false);
    showToast('Facture créée avec succès');
    setNewFac({ patient_id: '', sejour_id: '', date_echeance: '', notes: '' });
    await loadAll();
    openDetail(d.facture.id);
  }

  async function handleAddLigne(facture_id) {
    if (!newLigne.description || !newLigne.prix_unitaire) return showToast('Remplissez tous les champs');
    await fetch(`${API}/factures/${facture_id}/lignes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLigne),
    });
    setNewLigne({ description: '', categorie: 'Consultation', quantite: 1, prix_unitaire: '' });
    await openDetail(facture_id);
    loadAll();
    showToast('Prestation ajoutée');
  }

  async function handleDeleteLigne(ligne_id, facture_id) {
    if (!confirm('Supprimer cette ligne ?')) return;
    await fetch(`${API}/lignes-factures/${ligne_id}`, { method: 'DELETE' });
    await openDetail(facture_id);
    loadAll();
    showToast('Ligne supprimée');
  }

  async function handleAddPaiement(facture_id) {
    if (!newPmt.montant) return showToast('Entrez un montant');
    await fetch(`${API}/factures/${facture_id}/paiements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPmt),
    });
    setNewPmt({ montant: '', mode_paiement: 'Espèces', reference: '' });
    await openDetail(facture_id);
    loadAll();
    showToast('Paiement enregistré');
  }

  async function handleChangeStatut(facture_id, statut) {
    await fetch(`${API}/factures/${facture_id}/statut`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut }),
    });
    await openDetail(facture_id);
    loadAll();
    showToast('Statut mis à jour');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function exportPDF(facture) {
    const doc = new jsPDF();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('KAYAN CLINIQUE', 14, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Système d\'Information Hospitalier — Djibouti', 14, 24);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`FACTURE N° ${facture.numero}`, 130, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${fmtDate(facture.date_creation)}`, 130, 24);
    if (facture.date_echeance) doc.text(`Échéance: ${fmtDate(facture.date_echeance)}`, 130, 31);

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT', 14, 52);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(facture.patient_nom || '', 14, 60);
    if (facture.telephone) doc.text(`Tél: ${facture.telephone}`, 14, 67);
    if (facture.adresse) doc.text(facture.adresse, 14, 74);

    const statutColor = STATUTS[facture.statut] || '#94a3b8';
    doc.setFillColor(240, 244, 248);
    doc.rect(130, 50, 66, 28, 'F');
    doc.setFontSize(10);
    doc.text(`Statut: ${STATUTS_LABELS[facture.statut] || facture.statut}`, 133, 60);
    doc.text(`Total: ${fmt(facture.montant_total)}`, 133, 68);
    doc.text(`Payé: ${fmt(facture.montant_paye)}`, 133, 75);

    autoTable(doc, {
      startY: 88,
      head: [['Description', 'Catégorie', 'Qté', 'Prix unitaire', 'Total']],
      body: (facture.lignes || []).map(l => [
        l.description,
        l.categorie,
        l.quantite,
        fmt(l.prix_unitaire),
        fmt(l.montant),
      ]),
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });

    const y = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(30, 58, 95);
    doc.rect(130, y, 66, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TOTAL: ${fmt(facture.montant_total)}`, 133, y + 10);
    doc.text(`Payé: ${fmt(facture.montant_paye)}`, 133, y + 18);
    const reste = parseFloat(facture.montant_total || 0) - parseFloat(facture.montant_paye || 0);
    doc.text(`Reste: ${fmt(reste)}`, 133, y + 26);

    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Kayan Clinique — Djibouti | Tel: +253 XX XX XX XX', 14, 285);

    doc.save(`facture-${facture.numero}.pdf`);
  }

  const patientSejours = sejours.filter(s => s.patient_id === parseInt(newFac.patient_id) && s.statut === 'actif');
  const filtered = factures.filter(f => {
    if (filterStatut !== 'all' && f.statut !== filterStatut) return false;
    if (search && !f.patient_nom?.toLowerCase().includes(search.toLowerCase()) && !f.numero?.includes(search)) return false;
    return true;
  });

  const reste = selected ? parseFloat(selected.montant_total || 0) - parseFloat(selected.montant_paye || 0) : 0;

  return (
    <div className="main">
      {toast && <div className="toast">{toast}</div>}

      {/* KPI Cards */}
      <div className="cards-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-icon">🧾</div>
          <div className="card-value">{stats.total_factures || 0}</div>
          <div className="card-label">Total factures</div>
        </div>
        <div className="card">
          <div className="card-icon">⏳</div>
          <div className="card-value" style={{ fontSize: 18 }}>{fmt(stats.a_recouvrer)}</div>
          <div className="card-label">À recouvrer</div>
        </div>
        <div className="card">
          <div className="card-icon">✅</div>
          <div className="card-value" style={{ fontSize: 18 }}>{fmt(stats.paye_ce_mois)}</div>
          <div className="card-label">Payé ce mois</div>
        </div>
        <div className="card">
          <div className="card-icon">⚠️</div>
          <div className="card-value" style={{ color: '#f59e0b' }}>{stats.partielles || 0}</div>
          <div className="card-label">Paiements partiels</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="section">
        <div className="section-header">
          <h2>
            {view === 'list' && '🧾 Factures'}
            {view === 'create' && '➕ Nouvelle Facture'}
            {view === 'detail' && selected && `📄 ${selected.numero}`}
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {view !== 'list' && (
              <button className="btn btn-outline" onClick={() => setView('list')}>← Retour</button>
            )}
            {view === 'list' && (
              <button className="btn btn-primary" onClick={() => setView('create')}>+ Nouvelle facture</button>
            )}
            {view === 'detail' && selected && (
              <>
                <button className="btn btn-outline" onClick={() => exportPDF(selected)}>📄 Exporter PDF</button>
                {selected.statut === 'brouillon' && (
                  <button className="btn btn-primary" onClick={() => handleChangeStatut(selected.id, 'emise')}>📤 Émettre</button>
                )}
                {selected.statut !== 'annulee' && selected.statut !== 'payee' && (
                  <button className="btn btn-danger" onClick={() => handleChangeStatut(selected.id, 'annulee')}>✕ Annuler</button>
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
                placeholder="Rechercher patient ou N° facture..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}
              />
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13 }}>
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUTS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {loading ? <div className="empty">Chargement...</div> : filtered.length === 0 ? (
              <div className="empty">Aucune facture trouvée</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>N° Facture</th>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Échéance</th>
                    <th>Total</th>
                    <th>Payé</th>
                    <th>Reste</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => {
                    const r = parseFloat(f.montant_total || 0) - parseFloat(f.montant_paye || 0);
                    return (
                      <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(f.id)}>
                        <td><strong style={{ color: '#1e3a5f' }}>{f.numero}</strong></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ background: '#2563eb', width: 32, height: 32, fontSize: 11 }}>
                              {f.patient_nom?.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{f.patient_nom}</span>
                          </div>
                        </td>
                        <td>{fmtDate(f.date_creation)}</td>
                        <td>{fmtDate(f.date_echeance)}</td>
                        <td><strong>{fmt(f.montant_total)}</strong></td>
                        <td style={{ color: '#10b981' }}>{fmt(f.montant_paye)}</td>
                        <td style={{ color: r > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{fmt(r)}</td>
                        <td>
                          <span className="badge" style={{
                            background: STATUTS[f.statut] + '22',
                            color: STATUTS[f.statut],
                          }}>
                            {STATUTS_LABELS[f.statut] || f.statut}
                          </span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-outline" style={{ fontSize: 11, padding: '4px 10px' }}
                            onClick={() => openDetail(f.id)}>Voir</button>
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
                  <select value={newFac.patient_id}
                    onChange={e => setNewFac({ ...newFac, patient_id: e.target.value, sejour_id: '' })}>
                    <option value="">Sélectionner un patient</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Séjour lié (optionnel)</label>
                  <select value={newFac.sejour_id} onChange={e => setNewFac({ ...newFac, sejour_id: e.target.value })}>
                    <option value="">Aucun</option>
                    {patientSejours.map(s => (
                      <option key={s.id} value={s.id}>Séjour #{s.id} — {s.motif || 'Sans motif'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date d'échéance</label>
                  <input type="date" value={newFac.date_echeance}
                    onChange={e => setNewFac({ ...newFac, date_echeance: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input placeholder="Notes internes..." value={newFac.notes}
                    onChange={e => setNewFac({ ...newFac, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreateFacture} disabled={saving}>
              {saving ? 'Création...' : '✓ Créer la facture'}
            </button>
          </div>
        )}

        {/* === DETAIL VIEW === */}
        {view === 'detail' && selected && (
          <div>
            {/* Résumé */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>PATIENT</div>
                <div style={{ fontWeight: 700, marginTop: 4, fontSize: 15 }}>{selected.patient_nom}</div>
                {selected.telephone && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{selected.telephone}</div>}
              </div>
              <div style={{ background: '#f0f4f8', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>MONTANT</div>
                <div style={{ fontWeight: 700, marginTop: 4, fontSize: 15, color: '#1e3a5f' }}>{fmt(selected.montant_total)}</div>
                <div style={{ fontSize: 12, color: '#10b981' }}>Payé: {fmt(selected.montant_paye)}</div>
              </div>
              <div style={{ background: reste > 0 ? '#fff1f2' : '#f0fdf4', borderRadius: 10, padding: '14px 16px', border: reste > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>RESTE À PAYER</div>
                <div style={{ fontWeight: 800, marginTop: 4, fontSize: 18, color: reste > 0 ? '#ef4444' : '#10b981' }}>
                  {fmt(reste)}
                </div>
                <span className="badge" style={{ background: STATUTS[selected.statut] + '22', color: STATUTS[selected.statut], marginTop: 4 }}>
                  {STATUTS_LABELS[selected.statut]}
                </span>
              </div>
            </div>

            {/* Lignes de facturation */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>Prestations</h3>
              {(selected.lignes || []).length === 0 ? (
                <div className="empty" style={{ padding: '20px 0' }}>Aucune prestation — ajoutez-en ci-dessous</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Catégorie</th>
                      <th>Qté</th>
                      <th>Prix unitaire</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lignes.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.description}</td>
                        <td>
                          <span className="badge" style={{ background: '#dbeafe', color: '#1d4ed8' }}>{l.categorie}</span>
                        </td>
                        <td>{l.quantite}</td>
                        <td>{fmt(l.prix_unitaire)}</td>
                        <td><strong>{fmt(l.montant)}</strong></td>
                        <td>
                          {selected.statut === 'brouillon' && (
                            <button className="btn btn-danger" style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => handleDeleteLigne(l.id, selected.id)}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selected.statut === 'brouillon' && (
                <div className="form-box" style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>+ Ajouter une prestation</div>
                  <div className="form-row">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Description</label>
                      <input placeholder="Ex: Consultation médecin généraliste" value={newLigne.description}
                        onChange={e => setNewLigne({ ...newLigne, description: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Catégorie</label>
                      <select value={newLigne.categorie} onChange={e => setNewLigne({ ...newLigne, categorie: e.target.value })}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantité</label>
                      <input type="number" min="1" step="0.5" value={newLigne.quantite}
                        onChange={e => setNewLigne({ ...newLigne, quantite: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Prix unitaire (DJF)</label>
                      <input type="number" min="0" placeholder="0" value={newLigne.prix_unitaire}
                        onChange={e => setNewLigne({ ...newLigne, prix_unitaire: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={() => handleAddLigne(selected.id)}>Ajouter</button>
                  </div>
                </div>
              )}
            </div>

            {/* Paiements */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', marginBottom: 12 }}>Paiements reçus</h3>
              {(selected.paiements || []).length === 0 ? (
                <div className="empty" style={{ padding: '20px 0' }}>Aucun paiement enregistré</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Mode</th>
                      <th>Référence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.paiements.map(p => (
                      <tr key={p.id}>
                        <td>{fmtDate(p.date_paiement)}</td>
                        <td><strong style={{ color: '#10b981' }}>{fmt(p.montant)}</strong></td>
                        <td>
                          <span className="badge" style={{ background: '#dcfce7', color: '#16a34a' }}>{p.mode_paiement}</span>
                        </td>
                        <td style={{ color: '#6b7280' }}>{p.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selected.statut !== 'payee' && selected.statut !== 'annulee' && (
                <div className="form-box" style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>+ Enregistrer un paiement</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Montant (DJF)</label>
                      <input type="number" min="0" placeholder={`Max: ${Math.max(0, reste).toFixed(0)}`}
                        value={newPmt.montant} onChange={e => setNewPmt({ ...newPmt, montant: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Mode de paiement</label>
                      <select value={newPmt.mode_paiement} onChange={e => setNewPmt({ ...newPmt, mode_paiement: e.target.value })}>
                        {MODES_PAIEMENT.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Référence / Reçu</label>
                      <input placeholder="N° reçu, transaction..." value={newPmt.reference}
                        onChange={e => setNewPmt({ ...newPmt, reference: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={() => handleAddPaiement(selected.id)}>Enregistrer</button>
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
