import { supabase } from './supabaseClient';
import { Paciente } from '../types';

const TABLE = 'pacientes';

function ensureClient() {
  if (!supabase) {
    throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  }
  return supabase;
}

export async function listPatients(): Promise<Paciente[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from(TABLE)
    .select('data, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => row.data as Paciente);
}

export async function savePatient(patient: Paciente): Promise<void> {
  const client = ensureClient();
  const { error } = await client
    .from(TABLE)
    .upsert({ id: patient.id, data: patient, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deletePatient(id: string): Promise<void> {
  const client = ensureClient();
  const { error } = await client.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function bulkUpsertPatients(patients: Paciente[]): Promise<void> {
  const client = ensureClient();
  if (patients.length === 0) return;
  const rows = patients.map((patient) => ({ id: patient.id, data: patient }));
  const { error } = await client.from(TABLE).upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}
