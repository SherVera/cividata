import { supabase } from './supabaseClient';

export interface GuardianOption {
  id: string;
  full_name: string;
  id_document: string | null;
  occupation: string | null;
  phone_primary: string | null;
  phone_alternate: string | null;
  email: string | null;
}

export interface Catalogs {
  nationalities: string[];
  states: string[];
  cities: string[];
  institutions: string[];
  bloodTypes: string[];
  allergies: string[];
  conditions: string[];
  medications: string[];
  diagnoses: string[];
  treatments: string[];
  guardians: GuardianOption[];
}

const EMPTY: Catalogs = {
  nationalities: [],
  states: [],
  cities: [],
  institutions: [],
  bloodTypes: [],
  allergies: [],
  conditions: [],
  medications: [],
  diagnoses: [],
  treatments: [],
  guardians: [],
};

async function listNames(table: string): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('name').order('name');
  if (error) return [];
  return (data || []).map((row: any) => row.name as string).filter(Boolean);
}

export async function fetchCatalogs(): Promise<Catalogs> {
  if (!supabase) return EMPTY;
  const [
    nationalities,
    states,
    cities,
    institutions,
    bloodTypes,
    allergies,
    conditions,
    medications,
    diagnoses,
    treatments,
    guardiansRes,
  ] = await Promise.all([
    listNames('nationalities'),
    listNames('states'),
    listNames('cities'),
    listNames('institutions'),
    listNames('blood_types'),
    listNames('allergies'),
    listNames('medical_conditions'),
    listNames('medications'),
    listNames('diagnoses'),
    listNames('treatments'),
    supabase
      .from('guardians')
      .select('id, full_name, id_document, occupation, phone_primary, phone_alternate, email')
      .order('full_name'),
  ]);

  return {
    nationalities,
    states,
    cities,
    institutions,
    bloodTypes,
    allergies,
    conditions,
    medications,
    diagnoses,
    treatments,
    guardians: (guardiansRes.data as GuardianOption[]) || [],
  };
}
