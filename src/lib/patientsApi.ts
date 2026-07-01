import { supabase } from './supabaseClient';
import { Paciente, NotaClinica, normalizeGrupoEtario, grupoEtarioFromAge, pacienteRequiereRepresentante, pacienteTieneEdad } from '../types';
import { resolveAgeGroupForSave } from './patientValidation';
import { joinMultiValue, parseMultiValue } from './multiValue';
import { deletePatientPhoto } from './patientPhotosApi';

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
  collection_center:collection_centers(id, name, geo_lat, geo_lng),
  clinical_notes(
    *,
    diagnosis:diagnoses(name),
    treatment:treatments(name)
  )
`;

function rowToPaciente(row: any): Paciente {
  const birth = row.birth_date || '';
  const hasBirth = !!birth;
  const computed = hasBirth ? computeAge(birth) : { years: 0, months: 0 };
  const years = hasBirth ? computed.years : (row.approx_age_years ?? 0);
  const months = hasBirth ? computed.months : (row.approx_age_months ?? 0);
  const hasAge = hasBirth || years > 0 || months > 0;
  const grupoEtario = hasAge
    ? grupoEtarioFromAge(years)
    : normalizeGrupoEtario(row.age_group);
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
    fotoPath: row.photo_path || null,
    grupoEtario,
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
    alergiasEspecificas: row.allergies_detail || row.allergy?.name || '',
    tieneCondicionMedica: !!row.has_condition,
    condicionMedicaEspecifica: row.condition_detail || row.condition?.name || '',
    tomaMedicamentos: !!row.takes_medication,
    medicamentosEspecificos: row.medication_detail || row.medication?.name || '',
    esquemaVacunacion: (row.vaccination_scheme as Paciente['esquemaVacunacion']) || 'Completo',
    asisteEscuela: !!row.attends_school,
    nivelEducativo: (row.education_level as Paciente['nivelEducativo']) || '',
    gradoAnio: row.grade || '',
    nombreInstitucion: row.institution?.name || '',
    notasClinicas: notes,
    fechaRegistro: row.registered_at || '',
    registradoPorId: row.created_by || null,
    puntoRegistroTipo: row.registration_site_type === 'medico' ? 'medico' : 'centro',
    centroAcopioId: row.registration_site_type === 'medico' ? '' : (row.collection_center_id || row.collection_center?.id || ''),
    centroAcopioNombre: row.registration_site_type === 'medico' ? '' : (row.collection_center?.name || ''),
    centroAcopioLat: row.registration_site_type === 'medico' ? null : (row.collection_center?.geo_lat ?? null),
    centroAcopioLng: row.registration_site_type === 'medico' ? null : (row.collection_center?.geo_lng ?? null),
    registroLat: row.registration_lat ?? null,
    registroLng: row.registration_lng ?? null,
    registrantLat: row.registrant_lat ?? null,
    registrantLng: row.registrant_lng ?? null,
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

async function resolveCatalogSelection(
  table: string,
  csv: string
): Promise<{ firstId: string | null; detail: string | null }> {
  const names = parseMultiValue(csv);
  if (names.length === 0) return { firstId: null, detail: null };
  const ids = await Promise.all(names.map((name) => getOrCreateNamed(table, name)));
  return { firstId: ids[0], detail: joinMultiValue(names) };
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
  const bloodTypeId = (p.grupoSanguineo || '').trim()
    ? await getOrCreateNamed('blood_types', p.grupoSanguineo)
    : null;
  const allergy = p.tieneAlergias
    ? await resolveCatalogSelection('allergies', p.alergiasEspecificas)
    : { firstId: null, detail: null };
  const condition = p.tieneCondicionMedica
    ? await resolveCatalogSelection('medical_conditions', p.condicionMedicaEspecifica)
    : { firstId: null, detail: null };
  const medication = p.tomaMedicamentos
    ? await resolveCatalogSelection('medications', p.medicamentosEspecificos)
    : { firstId: null, detail: null };
  const guardianId = pacienteRequiereRepresentante(p) ? await getOrCreateGuardian(p) : null;
  const hasBirthDate = !!(p.fechaNacimiento || '').trim();
  const grupoEtario = resolveAgeGroupForSave(p);

  const row = {
    id: p.id,
    first_name: (p.nombres || '').trim() || '(Sin nombre)',
    last_name: (p.apellidos || '').trim() || '(Sin apellido)',
    birth_date: hasBirthDate ? p.fechaNacimiento : null,
    gender: p.genero || null,
    id_document: (p.documentoIdentidad || '').trim() || null,
    photo_path: p.fotoPath || null,
    age_group: grupoEtario,
    approx_age_years: hasBirthDate ? null : (p.edadAnios > 0 ? p.edadAnios : null),
    approx_age_months: hasBirthDate ? null : (p.edadAnios === 0 && p.edadMeses > 0 ? p.edadMeses : null),
    nationality_id: nationalityId,
    address: (p.direccion || '').trim() || null,
    state_id: stateId,
    city_id: cityId,
    landmark: (p.puntoReferencia || '').trim() || null,
    guardian_id: guardianId,
    relationship: guardianId ? (p.parentesco || null) : null,
    height_cm: p.estatura || null,
    weight_kg: p.peso || null,
    blood_type_id: bloodTypeId,
    has_allergies: !!p.tieneAlergias,
    allergy_id: allergy.firstId,
    allergies_detail: allergy.detail,
    has_condition: !!p.tieneCondicionMedica,
    condition_id: condition.firstId,
    condition_detail: condition.detail,
    takes_medication: !!p.tomaMedicamentos,
    medication_id: medication.firstId,
    medication_detail: medication.detail,
    vaccination_scheme: p.esquemaVacunacion || null,
    attends_school: !!p.asisteEscuela,
    education_level: p.nivelEducativo || null,
    grade: (p.gradoAnio || '').trim() || null,
    institution_id: institutionId,
    registration_site_type: p.puntoRegistroTipo === 'medico' ? 'medico' : 'centro',
    collection_center_id:
      p.puntoRegistroTipo === 'medico' ? null : ((p.centroAcopioId || '').trim() || null),
    registration_lat: p.registroLat ?? null,
    registration_lng: p.registroLng ?? null,
    registrant_lat: p.registrantLat ?? null,
    registrant_lng: p.registrantLng ?? null,
    registered_at: p.fechaRegistro || new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('patients').upsert(row, { onConflict: 'id' });
  if (error) throw error;

  await saveNotes(p.id, p.notasClinicas || []);
}

export async function deletePatient(id: string): Promise<void> {
  const client = ensureClient();
  const existing = await client.from('patients').select('photo_path').eq('id', id).maybeSingle();
  const { error } = await client.from('patients').delete().eq('id', id);
  if (error) throw error;
  await deletePatientPhoto(existing.data?.photo_path).catch(() => undefined);
}

export async function bulkUpsertPatients(patients: Paciente[]): Promise<void> {
  for (const patient of patients) {
    await savePatient(patient);
  }
}
