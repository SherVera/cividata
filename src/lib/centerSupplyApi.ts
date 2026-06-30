import { supabase } from './supabaseClient';

export type SupplyEntryType = 'necesidad' | 'recepcion';

export interface SupplyCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface CenterSupplyEntry {
  id: string;
  collectionCenterId: string;
  collectionCenterName: string;
  entryDate: string;
  categoryId: string;
  categoryName: string;
  itemName: string;
  quantity: number;
  entryType: SupplyEntryType;
  createdBy: string;
  createdAt: string;
}

export interface SupplyItemBalance {
  categoryId: string;
  categoryName: string;
  itemName: string;
  needed: number;
  received: number;
  balance: number;
}

export type CreateCenterSupplyEntryInput = {
  collectionCenterId: string;
  categoryId?: string;
  categoryName?: string;
  itemName: string;
  quantity: number;
  entryType: SupplyEntryType;
  entryDate?: string;
};

function ensureClient() {
  if (!supabase) {
    throw new Error('No se pudo iniciar la conexión segura.');
  }
  return supabase;
}

function normalizeCategoryRow(row: any): SupplyCategory {
  return {
    id: row.id,
    name: row.name || '',
    createdAt: row.created_at || '',
  };
}

function normalizeEntryType(value: unknown): SupplyEntryType {
  return value === 'recepcion' ? 'recepcion' : 'necesidad';
}

function normalizeRow(row: any): CenterSupplyEntry {
  const center = row.collection_center ?? row.collection_centers;
  const category = row.category ?? row.supply_categories;
  return {
    id: row.id,
    collectionCenterId: row.collection_center_id,
    collectionCenterName: center?.name || 'Centro sin nombre',
    entryDate: row.entry_date || '',
    categoryId: category?.id || row.category_id || '',
    categoryName: category?.name || 'Sin clasificar',
    itemName: row.item_name || '',
    quantity: Number(row.quantity ?? 0),
    entryType: normalizeEntryType(row.entry_type),
    createdBy: row.created_by,
    createdAt: row.created_at || '',
  };
}

const SELECT_QUERY = `
  *,
  collection_center:collection_centers(id, name),
  category:supply_categories(id, name)
`;

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatSupplyEntryDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatSupplyRegisteredAt(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function entryRegisteredOnDifferentDay(
  entry: Pick<CenterSupplyEntry, 'entryDate' | 'createdAt'>
): boolean {
  if (!entry.entryDate || !entry.createdAt) return false;
  return entry.entryDate !== entry.createdAt.slice(0, 10);
}

export function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

export function aggregateSupplyBalances(entries: CenterSupplyEntry[]): SupplyItemBalance[] {
  const map = new Map<string, SupplyItemBalance>();

  for (const entry of entries) {
    const key = `${entry.categoryId}::${entry.itemName.trim().toLowerCase()}`;
    const current = map.get(key) || {
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      itemName: entry.itemName.trim(),
      needed: 0,
      received: 0,
      balance: 0,
    };

    if (entry.entryType === 'necesidad') {
      current.needed += entry.quantity;
    } else {
      current.received += entry.quantity;
    }
    current.balance = current.needed - current.received;
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.balance !== a.balance) return b.balance - a.balance;
    return a.itemName.localeCompare(b.itemName, 'es');
  });
}

export async function listSupplyCategories(): Promise<SupplyCategory[]> {
  const client = ensureClient();
  const { data, error } = await client
    .from('supply_categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(normalizeCategoryRow);
}

export async function findOrCreateSupplyCategory(name: string): Promise<SupplyCategory> {
  const client = ensureClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Indique la clasificación.');

  const existing = await listSupplyCategories();
  const match = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (match) return match;

  const { data, error } = await client
    .from('supply_categories')
    .insert({ name: trimmed })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const retry = (await listSupplyCategories()).find(
        (c) => c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (retry) return retry;
    }
    throw error;
  }

  return normalizeCategoryRow(data);
}

async function resolveCategoryId(input: Pick<CreateCenterSupplyEntryInput, 'categoryId' | 'categoryName'>) {
  if (input.categoryId) {
    const categories = await listSupplyCategories();
    const match = categories.find((c) => c.id === input.categoryId);
    if (match) return match.id;
  }
  if (input.categoryName?.trim()) {
    return (await findOrCreateSupplyCategory(input.categoryName)).id;
  }
  throw new Error('Seleccione o cree una clasificación.');
}

export async function listCenterSupplyEntries(options?: {
  centerId?: string;
  categoryId?: string | 'all';
  entryType?: SupplyEntryType | 'all';
  fromDate?: string;
  toDate?: string;
}): Promise<CenterSupplyEntry[]> {
  const client = ensureClient();
  let query = client
    .from('center_supply_entries')
    .select(SELECT_QUERY)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.centerId) {
    query = query.eq('collection_center_id', options.centerId);
  }
  if (options?.categoryId && options.categoryId !== 'all') {
    query = query.eq('category_id', options.categoryId);
  }
  if (options?.entryType && options.entryType !== 'all') {
    query = query.eq('entry_type', options.entryType);
  }
  if (options?.fromDate) {
    query = query.gte('entry_date', options.fromDate);
  }
  if (options?.toDate) {
    query = query.lte('entry_date', options.toDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeRow);
}

export async function countOpenSupplyNeeds(): Promise<number> {
  const entries = await listCenterSupplyEntries();
  return aggregateSupplyBalances(entries).filter((b) => b.balance > 0).length;
}

export async function createCenterSupplyEntry(
  input: CreateCenterSupplyEntryInput
): Promise<CenterSupplyEntry> {
  const client = ensureClient();
  const itemName = input.itemName.trim();
  if (!itemName) throw new Error('Indique el ítem.');
  if (!input.collectionCenterId) throw new Error('Seleccione un centro de acopio.');
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a cero.');
  }
  const entryDate = (input.entryDate || todayIsoDate()).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw new Error('Indique una fecha válida.');
  }

  const categoryId = await resolveCategoryId(input);

  const { data, error } = await client
    .from('center_supply_entries')
    .insert({
      collection_center_id: input.collectionCenterId,
      entry_date: entryDate,
      category_id: categoryId,
      item_name: itemName,
      quantity: input.quantity,
      entry_type: input.entryType,
    })
    .select(SELECT_QUERY)
    .single();

  if (error) throw error;
  return normalizeRow(data);
}
