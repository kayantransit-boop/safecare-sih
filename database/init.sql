-- ============================================
-- SafeCare Hospital Information System
-- Base de données PostgreSQL
-- ============================================

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    age INT NOT NULL,
    sexe VARCHAR(10) NOT NULL,
    date_naissance DATE,
    telephone VARCHAR(20),
    adresse TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sejours (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    staff_id INT REFERENCES staff(id),
    admission_date TIMESTAMP NOT NULL DEFAULT NOW(),
    discharge_date TIMESTAMP,
    motif TEXT,
    statut VARCHAR(20) DEFAULT 'actif'
);

CREATE TABLE vitals (
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

-- Données de test
INSERT INTO patients (nom, age, sexe) VALUES
  ('Mohamed Aden', 45, 'M'),
  ('Hodan Ali', 32, 'F'),
  ('Omar Hassan', 67, 'M');

INSERT INTO staff (nom, role, email) VALUES
  ('Dr. Fadumo Warsame', 'Médecin', 'fadumo@safecare.dj'),
  ('Inf. Ahmed Abdi', 'Infirmier', 'ahmed@safecare.dj');
