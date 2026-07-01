import { describe, expect, it } from 'vitest';
import type { CollectionCenter } from './collectionCentersApi';
import { buildCenterSearchList, resolveRecentCenters } from './centerPicker';

const centers: CollectionCenter[] = [
  {
    id: 'c1',
    name: 'Centro Salud Chacao',
    address: 'Av. Principal',
    geo_lat: 10.5,
    geo_lng: -66.8,
    active: true,
    facility_type: 'acopio' as const,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'c2',
    name: 'Ambulatorio Petare',
    address: '',
    geo_lat: 10.48,
    geo_lng: -66.82,
    active: true,
    facility_type: 'acopio' as const,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'c3',
    name: 'Centro Norte',
    address: '',
    geo_lat: 10.49,
    geo_lng: -66.81,
    active: true,
    facility_type: 'acopio' as const,
    created_at: '',
    updated_at: '',
  },
];

describe('centerPicker', () => {
  it('devuelve recientes activos en orden', () => {
    const recent = resolveRecentCenters(['c2', 'c9', 'c1'], centers);
    expect(recent.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('prioriza recientes en resultados de búsqueda', () => {
    const list = buildCenterSearchList(centers, ['c3', 'c1'], 'centro');
    expect(list.map((c) => c.id)).toEqual(['c3', 'c1']);
  });

  it('sin búsqueda muestra solo los recientes', () => {
    const list = buildCenterSearchList(centers, ['c2', 'c1'], '');
    expect(list.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('sin búsqueda ni recientes muestra todos los activos', () => {
    const list = buildCenterSearchList(centers, [], '');
    expect(list.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });
});
