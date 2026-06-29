import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRecentCenterIds, recordRecentCenter } from './recentCenters';

const STORAGE_KEY = 'censo_recent_centers_v2';

beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('censo_recent_centers_v1');
});

describe('recentCenters', () => {
  it('prioriza por frecuencia de uso y limita a 3 centros', () => {
    recordRecentCenter('a');
    recordRecentCenter('b');
    recordRecentCenter('c');
    recordRecentCenter('d');
    recordRecentCenter('a');
    recordRecentCenter('a');

    const ids = getRecentCenterIds();
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('a');
  });

  it('migra el formato v1 al registrar de nuevo', () => {
    localStorage.setItem('censo_recent_centers_v1', JSON.stringify(['x', 'y']));
    recordRecentCenter('x');

    expect(getRecentCenterIds()[0]).toBe('x');
    expect(localStorage.getItem('censo_recent_centers_v1')).toBeNull();
  });
});
