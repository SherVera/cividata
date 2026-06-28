import { supabase } from './supabaseClient';
import { Paciente, NotaClinica } from '../types';

function ensureClient() {
  if (!supabase) {
    throw new Error('No se pudo iniciar la conexión segura.');
  }
  return supabase;
}

function computeAge(birthDate: string): { years: number; months: number } {
  if (!birthDate) return { years: 0, months: 0 };
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return { years: 0, months: 0 };
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return { years: 0, months: 0 };
  return { years, months };
}

const PATIENT_SELECT = `
  *,
  nationality:nationalities(name),
  state:states(name),
  city:cities(name),
  institution:institutions(name),
  blood_type:blood_types(name),
  allergy:allergies(name),
  condition:medical_conditions(name),
  medication:medications(name),
  guardian:guardians(*),
  clinical_notes(
    *,
    diagnosis:diagnoses(name),
    treatment:treatments(name)
  )
`;

function rowToPaciente(row: any): Paciente {
  const birth = row.birth_date || '';
  const { years, months } = computeAge(birth);
  const notes: NotaClinica[] = (row.clinical_notes || [])
    .map((n: any) => ({
      id: n.id,
      fecha: n.note_date || '',
      peso: n.weight ?? 0,
      estatura: n.height ?? 0,
      motivo: n.reason || '',
      diagnostico: n.diagnosis?.name || '',
      tratamiento: n.treatment?.name || '',
    }))
    .sort((a: NotaClinica, b: NotaClinica) => b.fecha.localeCompare(a.fecha));

  return {
    id: row.id,
    nombres: row.first_name || '',
    apellidos: row.last_name || '',
    fechaNacimiento: birth,
    edadAnios: years,
    edadMeses: months,
    genero: (row.gender as Paciente['genero']) || 'Masculino',
    documentoIdentidad: row.id_document || '',
    nacionalidad: row.nationality?.name || '',
    direccion: row.address || '',
    ciudadMunicipio: row.city?.name || '',
    estadoProvincia: row.state?.name || '',
    puntoReferencia: row.landmark || '',
    nombreRepresentante: row.guardian?.full_name || '',
    parentesco: (row.relationship as Paciente['parentesco']) || 'Madre',
    documentoRepresentante: row.guardian?.id_document || '',
    ocupacion: row.guardian?.occupation || '',
    telefonoPrincipal: row.guardian?.phone_primary || '',
    telefonoEmergencias: row.guardian?.phone_alternate || '',
    correo: row.guardian?.email || '',
    estatura: row.height_cm ?? 0,
    peso: row.weight_kg ?? 0,
    grupoSanguineo: row.blood_type?.name || '',
    tieneAlergias: !!row.has_allergies,
    alergiasEspecificas: row.allergy?.name || '',
    tieneCondicionMedica: !!row.has_condition,
    condicionMedicaEspecifica: row.condition?.name || '',
    tomaMedicamentos: !!row.takes_medication,
    medicamentosEspecificos: row.medication?.name || '',
    esquemaVacunacion: (row.vaccination_scheme as Paciente['esquemaVacunacion']) || 'Completo',
    asisteEscuela: !!row.attends_school,
    nivelEducativo: (row.education_level as Paciente['nivelEducativo']) || '',
    gradoAnio: row.grade || '',
    nombreInstitucion: row.institution?.name || '',
    notasClinicas: notes,
    fechaRegistro: row.registered_at || '',
  };
}

// --- Catalog get-or-create (avoids duplicate manual entries) ---

async function getOrCreateNamed(table: string, value: string): Promise<string | null> {
  const client = ensureClient();
  const v = (value || '').trim();
  if (!v) return null;
  const found = await client.from(table).select('id').eq('name', v).limit(1).maybeSingle();
  if (found.data) return found.data.id as string;
  const inserted = await client.from(table).insert({ name: v }).select('id').single();
  if (inserted.error) {
    const retry = await client.from(table).select('id').eq('name', v).limit(1).maybeSingle();
    if (retry.data) return retry.data.id as string;
    throw inserted.error;
  }
  return inserted.data.id as string;
}

async function getOrCreateCity(name: string, stateId: string | null): Promise<string | null> {
  const client = ensureClient();
  const v = (name || '').trim();
  if (!v) return null;
  let query = client.from('cities').select('id').eq('name', v);
  query = stateId ? query.eq('state_id', stateId) : query.is('state_id', null);
  const found = await query.limit(1).maybeSingle();
  if (found.data) return found.data.id as string;
  const inserted = await client.from('cities').insert({ name: v, state_id: stateId }).select('id').single();
  if (inserted.error) {
    let retryQuery = client.from('cities').select('id').eq('name', v);
    retryQuery = stateId ? retryQuery.eq('state_id', stateId) : retryQuery.is('state_id', null);
    const retry = await retryQuery.limit(1).maybeSingle();
    if (retry.data) return retry.data.id as string;
    throw inserted.error;
  }
  return inserted.data.id as string;
}

async function getOrCreateGuardian(p: Paciente): Promise<string | null> {
  const client = ensureClient();
  const fullName = (p.nombreRepresentante || '').trim();
  const doc = (p.documentoRepresentante || '').trim();
  if (!fullName && !doc) return null;

  const fields = {
    full_name: fullName || '(Sin nombre)',
    id_document: doc || null,
    occupation: (p.ocupacion || '').trim() || null,
    phone_primary: (p.telefonoPrincipal || '').trim() || null,
    phone_alternate: (p.telefonoEmergencias || '').trim() || null,
    email: (p.correo || '').trim() || null,
    updated_at: new Date().toISOString(),
  };

  let existing: { id: string } | null = null;
  if (doc) {
    existing = (await client.from('guardians').select('id').eq('id_document', doc).limit(1).maybeSingle()).data as any;
  }
  if (!existing && fullName) {
    existing = (await client.from('guardians').select('id').eq('full_name', fullName).limit(1).maybeSingle()).data as any;
  }
  if (existing) {
    await client.from('guardians').update(fields).eq('id', existing.id);
    return existing.id;
  }
  const inserted = await client.from('guardians').insert(fields).select('id').single();
  if (inserted.error) {
    if (doc) {
      const retry = (await client.from('guardians').select('id').eq('id_document', doc).limit(1).maybeSingle()).data as any;
      if (retry) return retry.id;
    }
    throw inserted.error;
  }
  return inserted.data.id as string;
}

async function saveNotes(patientId: string, notes: NotaClinica[]): Promise<void> {
  const client = ensureClient();
  if (!notes || notes.length === 0) return;
  const rows = await Promise.all(
    notes.map(async (n) => ({
      id: n.id || 'note-' + Math.random().toString(36).slice(2, 11),
      patient_id: patientId,
      note_date: n.fecha || null,
      weight: n.peso || null,
      height: n.estatura || null,
      reason: (n.motivo || '').trim() || null,
      diagnosis_id: await getOrCreateNamed('diagnoses', n.diagnostico),
      treatment_id: await getOrCreateNamed('treatments', n.tratamiento),
    }))
  );
  const { error } = await client.from('clinical_notes').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

// --- Public API ---

export async function listPatients(): Promise<Paciente[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from('patients')
    .select(PATIENT_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToPaciente);
}

export async function savePatient(p: Paciente): Promise<void> {
  const client = ensureClient();

  const nationalityId = await getOrCreateNamed('nationalities', p.nacionalidad);
  const stateId = await getOrCreateNamed('states', p.estadoProvincia);
  const cityId = await getOrCreateCity(p.ciudadMunicipio, stateId);
  const institutionId =
    p.asisteEscuela && (p.nombreInstitucion || '').trim()
      ? await getOrCreateNamed('institutions', p.nombreInstitucion)
      : null;
  const bloodTypeId = await getOrCreateNamed('blood_types', p.grupoSanguineo);
  const allergyId = p.tieneAlergias ? await getOrCreateNamed('allergies', p.alergiasEspecificas) : null;
  const conditionId = p.tieneCondicionMedica ? await getOrCreateNamed('medical_conditions', p.condicionMedicaEspecifica) : null;
  const medicationId = p.tomaMedicamentos ? await getOrCreateNamed('medications', p.medicamentosEspecificos) : null;
  const guardianId = await getOrCreateGuardian(p);

  const row = {
    id: p.id,
    first_name: (p.nombres || '').trim(),
    last_name: (p.apellidos || '').trim(),
    birth_date: p.fechaNacimiento || null,
    gender: p.genero || null,
    id_document: (p.documentoIdentidad || '').trim() || null,
    nationality_id: nationalityId,
    address: (p.direccion || '').trim() || null,
    state_id: stateId,
    city_id: cityId,
    landmark: (p.puntoReferencia || '').trim() || null,
    guardian_id: guardianId,
    relationship: p.parentesco || null,
    height_cm: p.estatura || null,
    weight_kg: p.peso || null,
    blood_type_id: bloodTypeId,
    has_allergies: !!p.tieneAlergias,
    allergy_id: allergyId,
    has_condition: !!p.tieneCondicionMedica,
    condition_id: conditionId,
    takes_medication: !!p.tomaMedicamentos,
    medication_id: medicationId,
    vaccination_scheme: p.esquemaVacunacion || null,
    attends_school: !!p.asisteEscuela,
    education_level: p.nivelEducativo || null,
    grade: (p.gradoAnio || '').trim() || null,
    institution_id: institutionId,
    registered_at: p.fechaRegistro || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('patients').upsert(row, { onConflict: 'id' });
  if (error) throw error;

  await saveNotes(p.id, p.notasClinicas || []);
}

export async function deletePatient(id: string): Promise<void> {
  const client = ensureClient();
  const { error } = await client.from('patients').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkUpsertPatients(patients: Paciente[]): Promise<void> {
  for (const patient of patients) {
    await savePatient(patient);
  }
}
