import { supabase } from '../lib/supabaseClient';
import { buildCareEpisodeSummary } from './summary';
import {
  canCreateCareEpisode,
  canTransition,
  getLatestClosedEpisode,
} from './transitions';
import type {
  CareBackgroundSnapshot,
  CareDiagnosis,
  CareEpisode,
  CareEpisodeBundle,
  CareEpisodeSource,
  CareEpisodeStatus,
  CareExam,
  CareTriage,
  CareTreatment,
  CreateCareEpisodeInput,
  DiagnosisKind,
  ExamStatus,
  PatientCareStatus,
  TreatmentKindCode,
  TreatmentStatus,
  TriageStatus,
  UrgencyClass,
} from './types';

function ensureClient() {
  if (!supabase) {
    throw new Error('No se pudo iniciar la conexión segura.');
  }
  return supabase;
}

const EPISODE_SELECT = `
  id,
  patient_id,
  previous_episode_id,
  status,
  collection_center_id,
  source,
  started_at,
  closed_at,
  created_by
`;

type EpisodeRow = {
  id: string;
  patient_id: string | null;
  previous_episode_id: string | null;
  status: CareEpisodeStatus;
  collection_center_id: string | null;
  source: CareEpisodeSource;
  started_at: string;
  closed_at: string | null;
  created_by: string | null;
};

function rowToEpisode(row: EpisodeRow): CareEpisode {
  return {
    id: row.id,
    patientId: row.patient_id,
    previousEpisodeId: row.previous_episode_id,
    status: row.status,
    collectionCenterId: row.collection_center_id,
    source: row.source,
    startedAt: row.started_at,
    closedAt: row.closed_at,
    createdBy: row.created_by,
  };
}

function rowToTriage(row: any): CareTriage {
  return {
    id: row.id,
    episodeId: row.episode_id,
    status: row.status as TriageStatus,
    weightKg: row.weight_kg ?? null,
    heightCm: row.height_cm ?? null,
    chiefComplaint: row.chief_complaint || '',
    urgencyClass: (row.urgency_class as UrgencyClass) || 'unclassified',
    completedAt: row.completed_at,
  };
}

async function fetchBackground(snapshotRow: any): Promise<CareBackgroundSnapshot> {
  const client = ensureClient();
  const snapshotId = snapshotRow.id as string;

  const [allergies, conditions, history, medications] = await Promise.all([
    client.from('care_snapshot_allergies').select('id, allergy_text').eq('snapshot_id', snapshotId),
    client.from('care_snapshot_conditions').select('id, condition_text').eq('snapshot_id', snapshotId),
    client
      .from('care_snapshot_history_entries')
      .select('id, entry_text')
      .eq('snapshot_id', snapshotId),
    client
      .from('care_snapshot_medications')
      .select('id, medication_text')
      .eq('snapshot_id', snapshotId),
  ]);

  if (allergies.error) throw allergies.error;
  if (conditions.error) throw conditions.error;
  if (history.error) throw history.error;
  if (medications.error) throw medications.error;

  return {
    id: snapshotId,
    episodeId: snapshotRow.episode_id,
    capturedAt: snapshotRow.captured_at,
    allergies: (allergies.data || []).map((r) => ({
      id: r.id,
      allergyText: r.allergy_text,
    })),
    conditions: (conditions.data || []).map((r) => ({
      id: r.id,
      conditionText: r.condition_text,
    })),
    historyEntries: (history.data || []).map((r) => ({
      id: r.id,
      entryText: r.entry_text,
    })),
    medications: (medications.data || []).map((r) => ({
      id: r.id,
      medicationText: r.medication_text,
    })),
  };
}

async function copyBackgroundFromEpisode(
  sourceEpisodeId: string,
  targetEpisodeId: string
): Promise<CareBackgroundSnapshot | null> {
  const client = ensureClient();
  const sourceSnapshot = await client
    .from('care_background_snapshots')
    .select('*')
    .eq('episode_id', sourceEpisodeId)
    .maybeSingle();
  if (sourceSnapshot.error) throw sourceSnapshot.error;
  if (!sourceSnapshot.data) return null;

  const sourceBackground = await fetchBackground(sourceSnapshot.data);
  const targetSnapshotId = await ensureBackgroundSnapshot(targetEpisodeId);

  await Promise.all([
    ...sourceBackground.allergies.map((row) =>
      client.from('care_snapshot_allergies').insert({
        snapshot_id: targetSnapshotId,
        allergy_text: row.allergyText,
      })
    ),
    ...sourceBackground.conditions.map((row) =>
      client.from('care_snapshot_conditions').insert({
        snapshot_id: targetSnapshotId,
        condition_text: row.conditionText,
      })
    ),
    ...sourceBackground.historyEntries.map((row) =>
      client.from('care_snapshot_history_entries').insert({
        snapshot_id: targetSnapshotId,
        entry_text: row.entryText,
      })
    ),
    ...sourceBackground.medications.map((row) =>
      client.from('care_snapshot_medications').insert({
        snapshot_id: targetSnapshotId,
        medication_text: row.medicationText,
      })
    ),
  ]);

  const targetSnapshot = await client
    .from('care_background_snapshots')
    .select('*')
    .eq('id', targetSnapshotId)
    .single();
  if (targetSnapshot.error) throw targetSnapshot.error;
  return fetchBackground(targetSnapshot.data);
}

async function suggestTriageFromEpisode(sourceEpisodeId: string): Promise<{
  weightKg: number | null;
  heightCm: number | null;
}> {
  const client = ensureClient();
  const triage = await client
    .from('care_triage')
    .select('weight_kg, height_cm')
    .eq('episode_id', sourceEpisodeId)
    .maybeSingle();
  if (triage.error) throw triage.error;
  return {
    weightKg: triage.data?.weight_kg ?? null,
    heightCm: triage.data?.height_cm ?? null,
  };
}

export async function listCareEpisodesByPatient(patientId: string): Promise<CareEpisode[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from('care_episodes')
    .select(EPISODE_SELECT)
    .eq('patient_id', patientId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => rowToEpisode(row as EpisodeRow));
}

export async function getActiveEpisodeForPatient(patientId: string): Promise<CareEpisode | null> {
  const episodes = await listCareEpisodesByPatient(patientId);
  return episodes.find((episode) => !['discharged', 'referred', 'cancelled'].includes(episode.status)) ?? null;
}

export async function getLatestEpisodeForPatient(patientId: string): Promise<CareEpisode | null> {
  const episodes = await listCareEpisodesByPatient(patientId);
  return episodes[0] ?? null;
}

export async function getCareEpisodeBundle(episodeId: string): Promise<CareEpisodeBundle> {
  const client = ensureClient();

  const episodeRes = await client
    .from('care_episodes')
    .select(EPISODE_SELECT)
    .eq('id', episodeId)
    .maybeSingle();
  if (episodeRes.error) throw episodeRes.error;
  if (!episodeRes.data) throw new Error('Episodio no encontrado.');

  const episode = rowToEpisode(episodeRes.data as EpisodeRow);

  const [triageRes, snapshotRes, diagnosesRes, treatmentsRes, examsRes] = await Promise.all([
    client.from('care_triage').select('*').eq('episode_id', episodeId).maybeSingle(),
    client.from('care_background_snapshots').select('*').eq('episode_id', episodeId).maybeSingle(),
    client
      .from('care_diagnoses')
      .select('id, episode_id, diagnosis_text, kind, recorded_at')
      .eq('episode_id', episodeId)
      .order('recorded_at', { ascending: false }),
    client
      .from('care_treatments')
      .select('id, episode_id, kind_code, status, started_at, ended_at, notes')
      .eq('episode_id', episodeId)
      .order('started_at', { ascending: false }),
    client
      .from('care_exams')
      .select('id, episode_id, name, status, result_text, requested_at, completed_at')
      .eq('episode_id', episodeId)
      .order('requested_at', { ascending: false }),
  ]);

  if (triageRes.error) throw triageRes.error;
  if (snapshotRes.error) throw snapshotRes.error;
  if (diagnosesRes.error) throw diagnosesRes.error;
  if (treatmentsRes.error) throw treatmentsRes.error;
  if (examsRes.error) throw examsRes.error;

  const triage = triageRes.data ? rowToTriage(triageRes.data) : null;
  const background = snapshotRes.data ? await fetchBackground(snapshotRes.data) : null;
  const diagnoses: CareDiagnosis[] = (diagnosesRes.data || []).map((r) => ({
    id: r.id,
    episodeId: r.episode_id,
    diagnosisText: r.diagnosis_text,
    kind: r.kind as DiagnosisKind,
    recordedAt: r.recorded_at,
  }));
  const treatments: CareTreatment[] = (treatmentsRes.data || []).map((r) => ({
    id: r.id,
    episodeId: r.episode_id,
    kindCode: r.kind_code as TreatmentKindCode,
    status: r.status as TreatmentStatus,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    notes: r.notes || '',
  }));
  const exams: CareExam[] = (examsRes.data || []).map((r) => ({
    id: r.id,
    episodeId: r.episode_id,
    name: r.name,
    status: r.status as ExamStatus,
    resultText: r.result_text || '',
    requestedAt: r.requested_at,
    completedAt: r.completed_at,
  }));

  return {
    episode,
    triage,
    background,
    diagnoses,
    treatments,
    exams,
    summary: buildCareEpisodeSummary({
      episode,
      triage,
      background,
      diagnoses,
      treatments,
      exams,
    }),
  };
}

export async function getPatientCareStatus(patientId: string): Promise<PatientCareStatus> {
  const episodes = await listCareEpisodesByPatient(patientId);
  const active = episodes.find((e) => !['discharged', 'referred', 'cancelled'].includes(e.status));
  const latest = episodes[0] ?? null;

  if (!latest) {
    return {
      patientId,
      episodeId: null,
      episodeStatus: null,
      source: null,
      summary: null,
      isLegacyOnly: true,
      canStartNewEpisode: true,
    };
  }

  const bundle = await getCareEpisodeBundle(active?.id ?? latest.id);
  return {
    patientId,
    episodeId: (active ?? latest).id,
    episodeStatus: (active ?? latest).status,
    source: (active ?? latest).source,
    summary: bundle.summary,
    isLegacyOnly: false,
    canStartNewEpisode: canCreateCareEpisode(episodes),
  };
}

export async function createCareEpisode(input: CreateCareEpisodeInput = {}): Promise<CareEpisode> {
  const client = ensureClient();
  const patientId = input.patientId ?? null;
  const carryOver = input.carryOverFromLastEpisode ?? true;
  const status = input.status ?? 'registered';

  let previousEpisodeId: string | null = null;
  let collectionCenterId = input.collectionCenterId ?? null;

  if (patientId) {
    const episodes = await listCareEpisodesByPatient(patientId);
    if (!canCreateCareEpisode(episodes)) {
      throw new Error('El paciente ya tiene un episodio abierto. Ciérrelo antes de crear uno nuevo.');
    }
    const lastClosed = getLatestClosedEpisode(episodes);
    if (lastClosed) {
      previousEpisodeId = lastClosed.id;
      if (!collectionCenterId) collectionCenterId = lastClosed.collectionCenterId;
    }
  }

  const { data, error } = await client
    .from('care_episodes')
    .insert({
      patient_id: patientId,
      previous_episode_id: previousEpisodeId,
      collection_center_id: collectionCenterId,
      status,
      source: 'live',
    })
    .select(EPISODE_SELECT)
    .single();
  if (error) throw error;

  await client.from('care_status_events').insert({
    episode_id: data.id,
    from_status: null,
    to_status: status,
  });

  if (carryOver && previousEpisodeId) {
    await copyBackgroundFromEpisode(previousEpisodeId, data.id);
    const suggested = await suggestTriageFromEpisode(previousEpisodeId);
    if (suggested.weightKg != null || suggested.heightCm != null) {
      await upsertCareTriage(data.id, {
        status: 'in_progress',
        weightKg: suggested.weightKg,
        heightCm: suggested.heightCm,
      });
    }
  }

  return rowToEpisode(data as EpisodeRow);
}

export async function transitionCareEpisode(
  episodeId: string,
  toStatus: CareEpisodeStatus
): Promise<CareEpisode> {
  const client = ensureClient();
  const current = await client
    .from('care_episodes')
    .select(EPISODE_SELECT)
    .eq('id', episodeId)
    .single();
  if (current.error) throw current.error;

  const fromStatus = current.data.status as CareEpisodeStatus;
  if (!canTransition(fromStatus, toStatus)) {
    throw new Error(`Transición no permitida: ${fromStatus} → ${toStatus}`);
  }

  const closedAt =
    toStatus === 'discharged' || toStatus === 'referred' || toStatus === 'cancelled'
      ? new Date().toISOString()
      : null;

  const { data, error } = await client
    .from('care_episodes')
    .update({
      status: toStatus,
      closed_at: closedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', episodeId)
    .select(EPISODE_SELECT)
    .single();
  if (error) throw error;

  await client.from('care_status_events').insert({
    episode_id: episodeId,
    from_status: fromStatus,
    to_status: toStatus,
  });

  return rowToEpisode(data as EpisodeRow);
}

export async function upsertCareTriage(
  episodeId: string,
  input: {
    status: TriageStatus;
    weightKg?: number | null;
    heightCm?: number | null;
    chiefComplaint?: string;
    urgencyClass?: UrgencyClass;
  }
): Promise<CareTriage> {
  const client = ensureClient();
  const completedAt = input.status === 'completed' ? new Date().toISOString() : null;
  const row = {
    episode_id: episodeId,
    status: input.status,
    weight_kg: input.weightKg ?? null,
    height_cm: input.heightCm ?? null,
    chief_complaint: (input.chiefComplaint || '').trim() || null,
    urgency_class: input.urgencyClass ?? 'unclassified',
    completed_at: completedAt,
  };

  const { data, error } = await client
    .from('care_triage')
    .upsert(row, { onConflict: 'episode_id' })
    .select('*')
    .single();
  if (error) throw error;

  if (input.status === 'completed') {
    const episode = await client.from('care_episodes').select('status').eq('id', episodeId).single();
    if (!episode.error && episode.data?.status === 'triage_in_progress') {
      await transitionCareEpisode(episodeId, 'triage_completed');
    }
  }

  return rowToTriage(data);
}

/** Abre o crea un episodio en triaje clínico para un paciente ya capturado en censo. */
export async function ensureClinicalTriageEpisode(
  patientId: string,
  collectionCenterId?: string | null
): Promise<CareEpisode> {
  let episode = await getActiveEpisodeForPatient(patientId);
  if (!episode) {
    return createCareEpisode({
      patientId,
      collectionCenterId: collectionCenterId ?? null,
      status: 'triage_in_progress',
    });
  }
  if (episode.status === 'registered') {
    return transitionCareEpisode(episode.id, 'triage_in_progress');
  }
  return episode;
}

export async function ensureBackgroundSnapshot(episodeId: string): Promise<string> {
  const client = ensureClient();
  const existing = await client
    .from('care_background_snapshots')
    .select('id')
    .eq('episode_id', episodeId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data?.id) return existing.data.id as string;

  const inserted = await client
    .from('care_background_snapshots')
    .insert({ episode_id: episodeId })
    .select('id')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id as string;
}

export async function addBackgroundAllergy(snapshotId: string, allergyText: string): Promise<void> {
  const client = ensureClient();
  const text = allergyText.trim();
  if (!text) return;
  const { error } = await client
    .from('care_snapshot_allergies')
    .insert({ snapshot_id: snapshotId, allergy_text: text });
  if (error) throw error;
}

export async function addBackgroundCondition(
  snapshotId: string,
  conditionText: string
): Promise<void> {
  const client = ensureClient();
  const text = conditionText.trim();
  if (!text) return;
  const { error } = await client
    .from('care_snapshot_conditions')
    .insert({ snapshot_id: snapshotId, condition_text: text });
  if (error) throw error;
}

export async function addBackgroundHistoryEntry(
  snapshotId: string,
  entryText: string
): Promise<void> {
  const client = ensureClient();
  const text = entryText.trim();
  if (!text) return;
  const { error } = await client
    .from('care_snapshot_history_entries')
    .insert({ snapshot_id: snapshotId, entry_text: text });
  if (error) throw error;
}

export async function addBackgroundMedication(
  snapshotId: string,
  medicationText: string
): Promise<void> {
  const client = ensureClient();
  const text = medicationText.trim();
  if (!text) return;
  const { error } = await client
    .from('care_snapshot_medications')
    .insert({ snapshot_id: snapshotId, medication_text: text });
  if (error) throw error;
}

export async function addCareDiagnosis(
  episodeId: string,
  diagnosisText: string,
  kind: DiagnosisKind = 'primary'
): Promise<CareDiagnosis> {
  const client = ensureClient();
  const text = diagnosisText.trim();
  if (!text) throw new Error('El diagnóstico no puede estar vacío.');

  const { data, error } = await client
    .from('care_diagnoses')
    .insert({
      episode_id: episodeId,
      diagnosis_text: text,
      kind,
    })
    .select('id, episode_id, diagnosis_text, kind, recorded_at')
    .single();
  if (error) throw error;

  const episode = await client.from('care_episodes').select('status').eq('id', episodeId).single();
  if (!episode.error && episode.data?.status === 'triage_completed') {
    await transitionCareEpisode(episodeId, 'care_started');
  }

  return {
    id: data.id,
    episodeId: data.episode_id,
    diagnosisText: data.diagnosis_text,
    kind: data.kind as DiagnosisKind,
    recordedAt: data.recorded_at,
  };
}

export async function addCareTreatment(
  episodeId: string,
  input: {
    kindCode: TreatmentKindCode | string;
    status?: TreatmentStatus;
    notes?: string;
    startedAt?: string | null;
  }
): Promise<CareTreatment> {
  const client = ensureClient();
  const status = input.status ?? 'active';
  const startedAt = input.startedAt ?? (status === 'active' ? new Date().toISOString() : null);

  const { data, error } = await client
    .from('care_treatments')
    .insert({
      episode_id: episodeId,
      kind_code: input.kindCode,
      status,
      notes: (input.notes || '').trim() || null,
      started_at: startedAt,
    })
    .select('id, episode_id, kind_code, status, started_at, ended_at, notes')
    .single();
  if (error) throw error;

  const episode = await client.from('care_episodes').select('status').eq('id', episodeId).single();
  if (
    !episode.error &&
    episode.data &&
    !['in_treatment', 'discharged', 'referred', 'cancelled'].includes(episode.data.status)
  ) {
    await transitionCareEpisode(episodeId, 'in_treatment');
  }

  return {
    id: data.id,
    episodeId: data.episode_id,
    kindCode: data.kind_code,
    status: data.status as TreatmentStatus,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    notes: data.notes || '',
  };
}

export async function addCareExam(
  episodeId: string,
  input: {
    name: string;
    status?: ExamStatus;
    resultText?: string;
  }
): Promise<CareExam> {
  const client = ensureClient();
  const name = input.name.trim();
  if (!name) throw new Error('El nombre del examen no puede estar vacío.');
  const status = input.status ?? 'requested';
  const completedAt = status === 'completed' ? new Date().toISOString() : null;

  const { data, error } = await client
    .from('care_exams')
    .insert({
      episode_id: episodeId,
      name,
      status,
      result_text: (input.resultText || '').trim() || null,
      completed_at: completedAt,
    })
    .select('id, episode_id, name, status, result_text, requested_at, completed_at')
    .single();
  if (error) throw error;

  const episode = await client.from('care_episodes').select('status').eq('id', episodeId).single();
  if (!episode.error && episode.data?.status === 'care_started' && status === 'requested') {
    await transitionCareEpisode(episodeId, 'exams_pending');
  }

  return {
    id: data.id,
    episodeId: data.episode_id,
    name: data.name,
    status: data.status as ExamStatus,
    resultText: data.result_text || '',
    requestedAt: data.requested_at,
    completedAt: data.completed_at,
  };
}

export async function completeCareExam(examId: string, resultText: string): Promise<CareExam> {
  const client = ensureClient();
  const { data, error } = await client
    .from('care_exams')
    .update({
      status: 'completed',
      result_text: resultText.trim() || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', examId)
    .select('id, episode_id, name, status, result_text, requested_at, completed_at')
    .single();
  if (error) throw error;

  const pending = await client
    .from('care_exams')
    .select('id', { count: 'exact', head: true })
    .eq('episode_id', data.episode_id)
    .eq('status', 'requested');
  if (pending.error) throw pending.error;
  if ((pending.count ?? 0) === 0) {
    const episode = await client
      .from('care_episodes')
      .select('status')
      .eq('id', data.episode_id)
      .single();
    if (!episode.error && episode.data?.status === 'exams_pending') {
      await transitionCareEpisode(data.episode_id, 'exams_completed');
    }
  }

  return {
    id: data.id,
    episodeId: data.episode_id,
    name: data.name,
    status: data.status as ExamStatus,
    resultText: data.result_text || '',
    requestedAt: data.requested_at,
    completedAt: data.completed_at,
  };
}
