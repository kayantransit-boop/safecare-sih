import { FastifyInstance } from 'fastify';
import {
  getPatients, addPatient, updatePatient, deletePatient,
  addVitals, getPatientVitals,
  getSejours, addSejour, dischargeSejour,
  getStaff, addStaff, deleteStaff,
  getAlerts, getOccupancy,
} from '../controllers/controller';

export default async function routes(fastify: FastifyInstance) {
  // Patients
  fastify.get('/patients', getPatients);
  fastify.post('/patients', addPatient);
  fastify.put('/patients/:id', updatePatient);
  fastify.delete('/patients/:id', deletePatient);
  fastify.get('/patients/:id/vitals', getPatientVitals);

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

  // Stats
  fastify.get('/alerts', getAlerts);
  fastify.get('/occupancy', getOccupancy);
}
