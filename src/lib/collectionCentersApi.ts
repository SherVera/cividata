import { supabase } from './supabaseClient';
import { roundGeo } from './geo';

export interface CollectionCenter {
  id: string;
  name: string;
  address: string | null;
  geo_lat: number;
  geo_lng: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type CollectionCenterInput = {
  name: string;
  address?: string;
  geo_lat: number;
  geo_lng: number;
  active?: boolean;
};

function ensureClient() {
  if (!supabase) {
    throw new Error('No se pudo iniciar la conexión segura.');
  }
  return supabase;
}

function normalizeRow(row: any): CollectionCenter {
  return {
    id: row.id,
    name: row.name || '',
    address: row.address ?? null,
    geo_lat: row.geo_lat,
    geo_lng: row.geo_lng,
    active: row.active !== false,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

export async function listCollectionCenters(activeOnly = false): Promise<CollectionCenter[]> {
  const client = ensureClient();
  let query = client.from('collection_centers').select('*').order('name');
  if (activeOnly) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeRow);
}

export async function saveCollectionCenter(
  input: CollectionCenterInput,
  id?: string
): Promise<CollectionCenter> {
  const client = ensureClient();
  const coords = roundGeo(input.geo_lat, input.geo_lng);
  const row = {
    name: input.name.trim(),
    address: (input.address || '').trim() || null,
    geo_lat: coords.lat,
    geo_lng: coords.lng,
    active: input.active !== false,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await client
      .from('collection_centers')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return normalizeRow(data);
  }

  const { data, error } = await client.from('collection_centers').insert(row).select('*').single();
  if (error) throw error;
  return normalizeRow(data);
}

export async function setCollectionCenterActive(id: string, active: boolean): Promise<void> {
  const client = ensureClient();
  const { error } = await client
    .from('collection_centers')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
