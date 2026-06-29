import { supabase } from './supabaseClient';

export interface LandingStats {
  totalPatients: number;
  registeredToday: number;
  registeredLast7Days: number;
  clinicalNotes: number;
  collectionCenters: number;
}

function mapLandingStatsRow(data: Record<string, unknown>): LandingStats {
  return {
    totalPatients: Number(data.total_patients) || 0,
    registeredToday: Number(data.registered_today) || 0,
    registeredLast7Days: Number(data.registered_last_7_days) || 0,
    clinicalNotes: Number(data.clinical_notes) || 0,
    collectionCenters: Number(data.collection_centers) || 0,
  };
}

export async function fetchLandingStats(): Promise<LandingStats | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('landing_stats');
  if (error || !data || typeof data !== 'object') return null;

  return mapLandingStatsRow(data as Record<string, unknown>);
}
