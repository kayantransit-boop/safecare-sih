# SafeCare — Règles du projet

## Description
SafeCare est un Système d'Information Hospitalier (SIH) fullstack.
- **Frontend** : React + Vite (port 3000)
- **Backend** : Node.js + Fastify + TypeScript (port 3001)
- **Base de données** : PostgreSQL 18 (BDD : `safecare`)

## Structure du projet
```
SafeCare/
├── client/          → Frontend React
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── VitalsDashboard.jsx
│       │   └── StaffDashboard.jsx
│       └── index.css
├── server/          → API Fastify/TypeScript
│   └── src/
│       ├── server.ts
│       ├── db.ts
│       ├── controllers/controller.ts
│       └── routes/routes.ts
├── database/
│   └── init.sql     → Schéma PostgreSQL
├── LANCER.bat       → Démarrer l'application
├── INSTALLER.bat    → Installer les dépendances
└── DIAGNOSTIC.bat   → Diagnostiquer les problèmes
```

## Base de données
- **Host** : localhost:5432
- **BDD** : safecare
- **User** : postgres
- **Password** : CCTV@4048588
- **Tables** : patients, sejours, staff, vitals
- **psql path** : `C:\Program Files\PostgreSQL\18\bin\psql.exe`

## Démarrage
Double-cliquer `LANCER.bat` — démarre API (3001) + Frontend (3000) + ouvre le navigateur.

## Fonctionnalités existantes
- Dashboard patients avec score NEWS2 automatique
- Saisie des signes vitaux (température, FC, PA, FR, SpO2, conscience, O2)
- Historique des signes vitaux par patient
- Gestion du personnel médical (ajout, suppression)
- KPI cards (total, risque élevé/moyen/faible)

## Règles de développement
- Ne pas modifier la structure de la base de données sans mettre à jour `init.sql`
- Toujours ajouter les nouveaux endpoints dans `routes.ts` ET `controller.ts`
- Le frontend utilise `/api` comme base URL (proxy Vite → port 3001)
- Conserver le style CSS existant dans `index.css`
- Langue de l'interface : **français**
- Ne pas ajouter de bibliothèques externes sans demander à l'utilisateur
