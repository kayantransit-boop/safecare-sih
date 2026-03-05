import { FastifyInstance } from 'fastify';
import {
  getPatients, addPatient, updatePatient, deletePatient,
  addVitals, getPatientVitals,
  getSejours, addSejour, dischargeSejour,
  getStaff, addStaff, deleteStaff,
  getAlerts, getOccupancy,
  // Facturation
  getFactures, getFacture, createFacture, updateFactureStatut,
  addLigneFacture, deleteLigneFacture, addPaiement, getStatsFacturation,
  // Laboratoire
  getAnalyses, getAnalyse, createAnalyse, updateAnalyseStatut,
  addResultatAnalyse, getPatientAnalyses, getStatsLabo,
} from '../controllers/controller';

export default async function routes(fastify: FastifyInstance) {
  // Patients
  fastify.get('/patients', getPatients);
  fastify.post('/patients', addPatient);
  fastify.put('/patients/:id', updatePatient);
  fastify.delete('/patients/:id', deletePatient);
  fastify.get('/patients/:id/vitals', getPatientVitals);
  fastify.get('/patients/:id/analyses', getPatientAnalyses);

  // Vitals
  fastify.post('/vitals', addVitals);

  // Séjours
  fastify.get('/sejours', getSejours);
  fastify.post('/sejours', addSejour);
  fastify.put('/sejours/:id/discharge', dischargeSejour);

  // Staff
  fastify.get('/staff', getStaff);
  fastify.post('/staff', addStaff);
  fastify.delete('/staff/:id', deleteStaff);

  // Stats générales
  fastify.get('/alerts', getAlerts);
  fastify.get('/occupancy', getOccupancy);

  // Facturation
  fastify.get('/factures', getFactures);
  fastify.post('/factures', createFacture);
  fastify.get('/factures/:id', getFacture);
  fastify.put('/factures/:id/statut', updateFactureStatut);
  fastify.post('/factures/:id/lignes', addLigneFacture);
  fastify.delete('/lignes-factures/:id', deleteLigneFacture);
  fastify.post('/factures/:id/paiements', addPaiement);
  fastify.get('/facturation/stats', getStatsFacturation);

  // Laboratoire
  fastify.get('/analyses', getAnalyses);
  fastify.post('/analyses', createAnalyse);
  fastify.get('/analyses/:id', getAnalyse);
  fastify.put('/analyses/:id/statut', updateAnalyseStatut);
  fastify.post('/analyses/:id/resultats', addResultatAnalyse);
  fastify.get('/labo/stats', getStatsLabo);
}
