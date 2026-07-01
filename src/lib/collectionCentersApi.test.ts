import { describe, expect, it } from 'vitest';
import { isAcopioCenter, type CollectionCenter } from './collectionCentersApi';

const base: CollectionCenter = {
  id: '1',
  name: 'Test',
  address: null,
  geo_lat: 0,
  geo_lng: 0,
  active: true,
  facility_type: 'acopio',
  created_at: '',
  updated_at: '',
};

describe('isAcopioCenter', () => {
  it('distingue acopio de hospital', () => {
    expect(isAcopioCenter(base)).toBe(true);
    expect(isAcopioCenter({ ...base, facility_type: 'hospital' })).toBe(false);
  });
});
