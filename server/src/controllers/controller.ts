import { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db';

// ===== CALCUL SCORE NEWS2 =====
interface VitalsInput {
  respiratory_rate?: number;
  temperature?: number;
  heart_rate?: number;
  blood_pressure?: string;
  spo2?: number;
  consciousness?: string;
  oxygen_supplement?: boolean;
}

export function computeNEWS2(v: VitalsInput): { score: number; riskLabel: string } {
  let score = 0;
  if (v.respiratory_rate !== undefined) {
    if (v.respiratory_rate <= 8)       score += 3;
    else if (v.respiratory_rate <= 11) score += 1;
    else if (v.respiratory_rate <= 20) score += 0;
    else if (v.respiratory_rate <= 24) score += 2;
    else                               score += 3;
  }
  if (v.temperature !== undefined) {
    if (v.temperature <= 35.0)         score += 3;
    else if (v.temperature <= 36.0)    score += 1;
    else if (v.temperature <= 38.0)    score += 0;
    else if (v.temperature <= 39.0)    score += 1;
    else                               score += 2;
  }
  if (v.heart_rate !== undefined) {
    if (v.heart_rate <= 40)            score += 3;
    else if (v.heart_rate <= 50)       score += 1;
    else if (v.heart_rate <= 90)       score += 0;
    else if (v.heart_rate <= 110)      score += 1;
    else if (v.heart_rate <= 130)      score += 2;
    else                               score += 3;
  }
  if (v.blood_pressure) {
    const systolic = parseInt(v.blood_pressure.split('/')[0]);
    if (!isNaN(systolic)) {
      if (systolic <= 90)              score += 3;
      else if (systolic <= 100)        score += 2;
      else if (systolic <= 110)        score += 1;
      else if (systolic <= 219)        score += 0;
      else                             score += 3;
    }
  }
  if (v.spo2 !== undefined) {
    if (v.spo2 <= 91)                  score += 3;
    else if (v.spo2 <= 93)            score += 2;
    else if (v.spo2 <= 95)            score += 1;
    else                               score += 0;
  }
  if (v.oxygen_supplement)             score += 2;
  if (v.consciousness && v.consciousness !== 'A') score += 3;
  const riskLabel = score <= 4 ? 'Faible risque' : score <= 6 ? 'Risque moyen' : 'Risque élevé';
  return { score, riskLabel };
}

// ===== PATIENTS =====

export const getPatients = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await pool.query(`
      SELECT p.*,
        (SELECT v.news2_score FROM vitals v JOIN sejours s ON v.sejour_id = s.id
         WHERE s.patient_id = p.id ORDER BY v.recorded_at DESC LIMIT 1) AS last_news2,
        (SELECT v.risk_label FROM vitals v JOIN sejours s ON v.sejour_id = s.id
         WHERE s.patient_id = p.id ORDER BY v.recorded_at DESC LIMIT 1) AS last_risk
      FROM patients p ORDER BY p.id DESC
    `);
    return reply.send({ patients: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const addPatient = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { nom, age, sexe, telephone, adresse, date_naissance } = request.body as any;
    const result = await pool.query(
      `INSERT INTO patients (nom, age, sexe, telephone, adresse, date_naissance)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nom, age, sexe, telephone || null, adresse || null, date_naissance || null]
    );
    return reply.code(201).send({ patient: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const updatePatient = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const { nom, age, sexe, telephone, adresse, date_naissance } = request.body as any;
    const result = await pool.query(
      `UPDATE patients SET nom=$1, age=$2, sexe=$3, telephone=$4, adresse=$5, date_naissance=$6
       WHERE id=$7 RETURNING *`,
      [nom, age, sexe, telephone || null, adresse || null, date_naissance || null, id]
    );
    return reply.send({ patient: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const deletePatient = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    await pool.query(`DELETE FROM patients WHERE id=$1`, [id]);
    return reply.send({ success: true });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

// ===== VITALS =====

export const addVitals = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const body = request.body as any;
    const { sejour_id, temperature, heart_rate, blood_pressure, respiratory_rate, spo2, consciousness, oxygen_supplement } = body;
    const { score, riskLabel } = computeNEWS2({ respiratory_rate, temperature, heart_rate, blood_pressure, spo2, consciousness, oxygen_supplement });
    const result = await pool.query(
      `INSERT INTO vitals (sejour_id, temperature, heart_rate, blood_pressure, respiratory_rate, spo2, consciousness, oxygen_supplement, news2_score, risk_label)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [sejour_id, temperature, heart_rate, blood_pressure, respiratory_rate, spo2, consciousness ?? 'A', oxygen_supplement ?? false, score, riskLabel]
    );
    return reply.code(201).send({ vitals: result.rows[0], news2Score: score, riskLabel });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getPatientVitals = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const result = await pool.query(
      `SELECT v.* FROM vitals v JOIN sejours s ON v.sejour_id = s.id
       WHERE s.patient_id = $1 ORDER BY v.recorded_at DESC LIMIT 50`, [id]
    );
    return reply.send({ vitals: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

// ===== SÉJOURS =====

export const getSejours = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await pool.query(`
      SELECT s.*, p.nom AS patient_nom, p.age, p.sexe, st.nom AS staff_nom, st.role AS staff_role
      FROM sejours s
      JOIN patients p ON s.patient_id = p.id
      LEFT JOIN staff st ON s.staff_id = st.id
      ORDER BY s.admission_date DESC
    `);
    return reply.send({ sejours: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const addSejour = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { patient_id, staff_id, motif } = request.body as any;
    const result = await pool.query(
      `INSERT INTO sejours (patient_id, staff_id, motif, statut)
       VALUES ($1,$2,$3,'actif') RETURNING *`,
      [patient_id, staff_id || null, motif || null]
    );
    return reply.code(201).send({ sejour: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const dischargeSejour = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const result = await pool.query(
      `UPDATE sejours SET statut='sorti', discharge_date=NOW() WHERE id=$1 RETURNING *`, [id]
    );
    return reply.send({ sejour: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

// ===== ALERTES & OCCUPATION =====

export const getAlerts = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await pool.query(`
      SELECT p.nom, p.age, v.news2_score, v.risk_label, v.recorded_at
      FROM vitals v
      JOIN sejours s ON v.sejour_id = s.id
      JOIN patients p ON s.patient_id = p.id
      WHERE v.risk_label = 'Risque élevé'
        AND v.recorded_at = (
          SELECT MAX(v2.recorded_at) FROM vitals v2
          JOIN sejours s2 ON v2.sejour_id = s2.id
          WHERE s2.patient_id = p.id
        )
      ORDER BY v.news2_score DESC LIMIT 10
    `);
    return reply.send({ alerts: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getOccupancy = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const total = 30;
    const result = await pool.query(`SELECT COUNT(*) FROM sejours WHERE statut = 'actif'`);
    const occupied = parseInt(result.rows[0].count);
    return reply.send({ total, occupied, available: total - occupied });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

// ===== STAFF =====

export const getStaff = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await pool.query(`SELECT * FROM staff ORDER BY id DESC`);
    return reply.send({ staff: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const addStaff = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { nom, role, email } = request.body as any;
    const result = await pool.query(
      `INSERT INTO staff (nom, role, email) VALUES ($1, $2, $3) RETURNING *`,
      [nom, role, email || null]
    );
    return reply.code(201).send({ staff: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const deleteStaff = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    await pool.query(`DELETE FROM staff WHERE id = $1`, [id]);
    return reply.send({ success: true });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

// ===== FACTURATION =====

async function recalcFactureTotal(facture_id: number) {
  const lines = await pool.query(
    `SELECT COALESCE(SUM(montant),0) AS total FROM lignes_factures WHERE facture_id = $1`, [facture_id]
  );
  const total = parseFloat(lines.rows[0].total);
  await pool.query(`UPDATE factures SET montant_total = $1 WHERE id = $2`, [total, facture_id]);
}

async function recalcFacturePaye(facture_id: number) {
  const pmt = await pool.query(
    `SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE facture_id = $1`, [facture_id]
  );
  const paye = parseFloat(pmt.rows[0].total);
  const fac = await pool.query(`SELECT montant_total FROM factures WHERE id = $1`, [facture_id]);
  const total = parseFloat(fac.rows[0]?.montant_total || 0);
  let statut = '';
  if (paye >= total && total > 0) statut = 'payee';
  else if (paye > 0) statut = 'partielle';
  if (statut) {
    await pool.query(`UPDATE factures SET montant_paye = $1, statut = $2 WHERE id = $3`, [paye, statut, facture_id]);
  } else {
    await pool.query(`UPDATE factures SET montant_paye = $1 WHERE id = $2`, [paye, facture_id]);
  }
}

export const getFactures = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await pool.query(`
      SELECT f.*, p.nom AS patient_nom, p.age, p.sexe
      FROM factures f
      JOIN patients p ON f.patient_id = p.id
      ORDER BY f.date_creation DESC
    `);
    return reply.send({ factures: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getFacture = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const [fac, lignes, pmts] = await Promise.all([
      pool.query(
        `SELECT f.*, p.nom AS patient_nom, p.telephone, p.adresse, p.age, p.sexe
         FROM factures f JOIN patients p ON f.patient_id = p.id WHERE f.id = $1`, [id]
      ),
      pool.query(`SELECT * FROM lignes_factures WHERE facture_id = $1 ORDER BY id`, [id]),
      pool.query(`SELECT * FROM paiements WHERE facture_id = $1 ORDER BY date_paiement`, [id]),
    ]);
    if (!fac.rows[0]) return reply.code(404).send({ error: 'Facture non trouvée' });
    return reply.send({ facture: { ...fac.rows[0], lignes: lignes.rows, paiements: pmts.rows } });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const createFacture = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { patient_id, sejour_id, date_echeance, notes } = request.body as any;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM factures WHERE DATE(date_creation) = CURRENT_DATE`
    );
    const count = parseInt(countRes.rows[0].count) + 1;
    const numero = `FAC-${dateStr}-${String(count).padStart(4, '0')}`;
    const result = await pool.query(
      `INSERT INTO factures (patient_id, sejour_id, numero, date_echeance, notes, statut)
       VALUES ($1, $2, $3, $4, $5, 'brouillon') RETURNING *`,
      [patient_id, sejour_id || null, numero, date_echeance || null, notes || null]
    );
    return reply.code(201).send({ facture: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const updateFactureStatut = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const { statut } = request.body as any;
    const result = await pool.query(
      `UPDATE factures SET statut = $1 WHERE id = $2 RETURNING *`, [statut, id]
    );
    return reply.send({ facture: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const addLigneFacture = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const { description, categorie, quantite, prix_unitaire } = request.body as any;
    const montant = parseFloat(quantite) * parseFloat(prix_unitaire);
    await pool.query(
      `INSERT INTO lignes_factures (facture_id, description, categorie, quantite, prix_unitaire, montant)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, description, categorie || 'autre', quantite, prix_unitaire, montant]
    );
    await recalcFactureTotal(parseInt(id));
    return reply.code(201).send({ success: true });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const deleteLigneFacture = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const ligne = await pool.query(`SELECT facture_id FROM lignes_factures WHERE id = $1`, [id]);
    if (!ligne.rows[0]) return reply.code(404).send({ error: 'Ligne non trouvée' });
    const facture_id = ligne.rows[0].facture_id;
    await pool.query(`DELETE FROM lignes_factures WHERE id = $1`, [id]);
    await recalcFactureTotal(facture_id);
    return reply.send({ success: true });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const addPaiement = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const { montant, mode_paiement, reference, notes } = request.body as any;
    await pool.query(
      `INSERT INTO paiements (facture_id, montant, mode_paiement, reference, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, montant, mode_paiement || 'especes', reference || null, notes || null]
    );
    await recalcFacturePaye(parseInt(id));
    return reply.code(201).send({ success: true });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getStatsFacturation = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const [total, enAttente, payeMois, partielles] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(montant_total),0) AS montant FROM factures WHERE statut != 'annulee'`),
      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(montant_total - montant_paye),0) AS reste FROM factures WHERE statut IN ('emise','partielle')`),
      pool.query(`SELECT COALESCE(SUM(montant_paye),0) AS total FROM factures WHERE DATE(date_creation) >= DATE_TRUNC('month', CURRENT_DATE)`),
      pool.query(`SELECT COUNT(*) AS count FROM factures WHERE statut = 'partielle'`),
    ]);
    return reply.send({
      total_factures: parseInt(total.rows[0].count),
      montant_total: parseFloat(total.rows[0].montant),
      a_recouvrer: parseFloat(enAttente.rows[0].reste),
      paye_ce_mois: parseFloat(payeMois.rows[0].total),
      partielles: parseInt(partielles.rows[0].count),
    });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

// ===== LABORATOIRE =====

export const getAnalyses = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = await pool.query(`
      SELECT a.*, p.nom AS patient_nom, p.age, st.nom AS medecin_nom
      FROM analyses a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN staff st ON a.medecin_id = st.id
      ORDER BY a.date_prescription DESC
    `);
    return reply.send({ analyses: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getAnalyse = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const [ana, res] = await Promise.all([
      pool.query(
        `SELECT a.*, p.nom AS patient_nom, p.age, p.sexe, st.nom AS medecin_nom
         FROM analyses a JOIN patients p ON a.patient_id = p.id
         LEFT JOIN staff st ON a.medecin_id = st.id WHERE a.id = $1`, [id]
      ),
      pool.query(`SELECT * FROM resultats_analyses WHERE analyse_id = $1 ORDER BY id`, [id]),
    ]);
    if (!ana.rows[0]) return reply.code(404).send({ error: 'Analyse non trouvée' });
    return reply.send({ analyse: { ...ana.rows[0], resultats: res.rows } });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const createAnalyse = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { patient_id, sejour_id, medecin_id, type_analyse, urgence, notes } = request.body as any;
    const result = await pool.query(
      `INSERT INTO analyses (patient_id, sejour_id, medecin_id, type_analyse, urgence, notes, statut)
       VALUES ($1, $2, $3, $4, $5, $6, 'prescrit') RETURNING *`,
      [patient_id, sejour_id || null, medecin_id || null, type_analyse, urgence || false, notes || null]
    );
    return reply.code(201).send({ analyse: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const updateAnalyseStatut = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const { statut } = request.body as any;
    const extra = statut === 'disponible' ? `, date_realisation = NOW()` : '';
    const result = await pool.query(
      `UPDATE analyses SET statut = $1${extra} WHERE id = $2 RETURNING *`, [statut, id]
    );
    return reply.send({ analyse: result.rows[0] });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const addResultatAnalyse = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const { parametre, valeur, unite, valeur_normale, statut_resultat } = request.body as any;
    await pool.query(
      `INSERT INTO resultats_analyses (analyse_id, parametre, valeur, unite, valeur_normale, statut_resultat)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, parametre, valeur, unite || null, valeur_normale || null, statut_resultat || 'normal']
    );
    await pool.query(
      `UPDATE analyses SET statut = 'disponible', date_realisation = COALESCE(date_realisation, NOW())
       WHERE id = $1 AND statut != 'valide'`, [id]
    );
    return reply.code(201).send({ success: true });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getPatientAnalyses = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { id } = request.params as { id: string };
    const result = await pool.query(
      `SELECT a.*, st.nom AS medecin_nom FROM analyses a
       LEFT JOIN staff st ON a.medecin_id = st.id
       WHERE a.patient_id = $1 ORDER BY a.date_prescription DESC`, [id]
    );
    return reply.send({ analyses: result.rows });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};

export const getStatsLabo = async (_req: FastifyRequest, reply: FastifyReply) => {
  try {
    const [prescrites, enCours, disponibles, critiques] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM analyses WHERE statut = 'prescrit'`),
      pool.query(`SELECT COUNT(*) FROM analyses WHERE statut = 'en_cours'`),
      pool.query(`SELECT COUNT(*) FROM analyses WHERE statut = 'disponible'`),
      pool.query(`SELECT COUNT(*) FROM resultats_analyses WHERE statut_resultat = 'critique'`),
    ]);
    return reply.send({
      prescrites: parseInt(prescrites.rows[0].count),
      en_cours: parseInt(enCours.rows[0].count),
      disponibles: parseInt(disponibles.rows[0].count),
      critiques: parseInt(critiques.rows[0].count),
    });
  } catch (error) {
    return reply.code(500).send({ error: 'Erreur interne du serveur' });
  }
};
