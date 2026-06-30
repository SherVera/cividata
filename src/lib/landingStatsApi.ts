import { supabase } from './supabaseClient';

export interface LandingOpenNeed {
  collectionCenterId: string;
  collectionCenterName: string;
  categoryId: string;
  categoryName: string;
  itemName: string;
  needed: number;
  received: number;
  balance: number;
}

export interface LandingStats {
  collectionCenters: number;
  openItems: number;
  pendingUnits: number;
  centersWithNeeds: number;
  needs: LandingOpenNeed[];
}

function mapNeedRow(raw: Record<string, unknown>): LandingOpenNeed {
  return {
    collectionCenterId: String(raw.collection_center_id ?? ''),
    collectionCenterName: String(raw.collection_center_name ?? 'Centro'),
    categoryId: String(raw.category_id ?? ''),
    categoryName: String(raw.category_name ?? 'Insumos'),
    itemName: String(raw.item_name ?? ''),
    needed: Number(raw.needed) || 0,
    received: Number(raw.received) || 0,
    balance: Number(raw.balance) || 0,
  };
}

function mapLandingStatsRow(data: Record<string, unknown>): LandingStats | null {
  // Versión antigua (pacientes) antes de insumos por centro
  if ('total_patients' in data && !('needs' in data)) {
    return null;
  }

  const needsRaw = Array.isArray(data.needs) ? data.needs : [];
  const needs = needsRaw
    .filter((row): row is Record<string, unknown> => row !== null && typeof row === 'object')
    .map(mapNeedRow)
    .filter((row) => row.balance > 0);

  const fromNeeds = {
    openItems: needs.length,
    pendingUnits: needs.reduce((sum, row) => sum + row.balance, 0),
    centersWithNeeds: new Set(needs.map((row) => row.collectionCenterId)).size,
  };

  return {
    collectionCenters: Number(data.collection_centers) || 0,
    openItems: fromNeeds.openItems || Number(data.open_items) || 0,
    pendingUnits: fromNeeds.pendingUnits || Number(data.pending_units) || 0,
    centersWithNeeds: fromNeeds.centersWithNeeds || Number(data.centers_with_needs) || 0,
    needs,
  };
}

export async function fetchLandingStats(): Promise<LandingStats | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('landing_stats');
  if (error || !data || typeof data !== 'object') return null;

  return mapLandingStatsRow(data as Record<string, unknown>);
}
