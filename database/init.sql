-- ============================================
-- SafeCare Hospital Information System
-- Base de données PostgreSQL
-- ============================================

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    sexe VARCHAR(10) NOT NULL,
    date_naissance DATE,
    telephone VARCHAR(20),
    adresse TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sejours (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    staff_id INT REFERENCES staff(id),
    admission_date TIMESTAMP NOT NULL DEFAULT NOW(),
    discharge_date TIMESTAMP,
    motif TEXT,
    statut VARCHAR(20) DEFAULT 'actif'
);

CREATE TABLE IF NOT EXISTS vitals (
    id SERIAL PRIMARY KEY,
    sejour_id INT REFERENCES sejours(id) ON DELETE CASCADE,
    temperature DECIMAL(5,2),
    heart_rate INT,
    blood_pressure VARCHAR(20),
    respiratory_rate INT,
    spo2 INT,
    consciousness VARCHAR(10) DEFAULT 'A',
    oxygen_supplement BOOLEAN DEFAULT FALSE,
    news2_score INT,
    risk_label VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- ===== FACTURATION =====

CREATE TABLE IF NOT EXISTS factures (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    sejour_id INT REFERENCES sejours(id),
    numero VARCHAR(50) UNIQUE NOT NULL,
    date_creation TIMESTAMP DEFAULT NOW(),
    date_echeance DATE,
    statut VARCHAR(20) DEFAULT 'brouillon',
    montant_total DECIMAL(10,2) DEFAULT 0,
    montant_paye DECIMAL(10,2) DEFAULT 0,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS lignes_factures (
    id SERIAL PRIMARY KEY,
    facture_id INT REFERENCES factures(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    categorie VARCHAR(50) DEFAULT 'autre',
    quantite DECIMAL(10,2) DEFAULT 1,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    montant DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS paiements (
    id SERIAL PRIMARY KEY,
    facture_id INT REFERENCES factures(id) ON DELETE CASCADE,
    date_paiement TIMESTAMP DEFAULT NOW(),
    montant DECIMAL(10,2) NOT NULL,
    mode_paiement VARCHAR(50) DEFAULT 'especes',
    reference VARCHAR(100),
    notes TEXT
);

-- ===== LABORATOIRE =====

CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    sejour_id INT REFERENCES sejours(id),
    medecin_id INT REFERENCES staff(id),
    date_prescription TIMESTAMP DEFAULT NOW(),
    date_realisation TIMESTAMP,
    type_analyse VARCHAR(100) NOT NULL,
    statut VARCHAR(30) DEFAULT 'prescrit',
    urgence BOOLEAN DEFAULT FALSE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS resultats_analyses (
    id SERIAL PRIMARY KEY,
    analyse_id INT REFERENCES analyses(id) ON DELETE CASCADE,
    parametre VARCHAR(100) NOT NULL,
    valeur VARCHAR(100),
    unite VARCHAR(50),
    valeur_normale VARCHAR(100),
    statut_resultat VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Données de test
INSERT INTO patients (nom, age, sexe) VALUES
  ('Mohamed Aden', 45, 'M'),
  ('Hodan Ali', 32, 'F'),
  ('Omar Hassan', 67, 'M')
ON CONFLICT DO NOTHING;

INSERT INTO staff (nom, role, email) VALUES
  ('Dr. Fadumo Warsame', 'Médecin', 'fadumo@safecare.dj'),
  ('Inf. Ahmed Abdi', 'Infirmier', 'ahmed@safecare.dj')
ON CONFLICT DO NOTHING;
