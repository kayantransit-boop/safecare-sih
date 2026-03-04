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
