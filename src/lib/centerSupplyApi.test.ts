import { describe, expect, it } from 'vitest';
import {
  aggregateSupplyBalances,
  computeSupplyDashboardStats,
  entryRegisteredOnDifferentDay,
  formatQty,
  projectReception,
  type CenterSupplyEntry,
} from './centerSupplyApi';

const baseEntry = (overrides: Partial<CenterSupplyEntry>): CenterSupplyEntry => ({
  id: '1',
  collectionCenterId: 'c1',
  collectionCenterName: 'Centro A',
  entryDate: '2026-06-30',
  categoryId: 'cat-insumos',
  categoryName: 'Insumos',
  itemName: 'Guantes M',
  quantity: 1,
  entryType: 'necesidad',
  createdBy: 'u1',
  createdAt: '2026-06-30T10:00:00Z',
  ...overrides,
});

describe('formatQty', () => {
  it('formats integers without decimals', () => {
    expect(formatQty(2)).toBe('2');
  });
});

describe('aggregateSupplyBalances', () => {
  it('calculates balance from necesidad and recepcion', () => {
    const balances = aggregateSupplyBalances([
      baseEntry({ id: '1', entryType: 'necesidad', quantity: 10 }),
      baseEntry({ id: '2', entryType: 'recepcion', quantity: 4 }),
    ]);
    expect(balances).toHaveLength(1);
    expect(balances[0]).toMatchObject({ needed: 10, received: 4, balance: 6 });
  });

  it('groups by category and item name', () => {
    const balances = aggregateSupplyBalances([
      baseEntry({
        id: '1',
        categoryId: 'cat-med',
        categoryName: 'Medicinas',
        itemName: 'Paracetamol',
        quantity: 5,
      }),
      baseEntry({ id: '2', categoryId: 'cat-ins', categoryName: 'Insumos', quantity: 3 }),
    ]);
    expect(balances).toHaveLength(2);
  });
});

describe('computeSupplyDashboardStats', () => {
  it('agrega totales, centros y clasificaciones', () => {
    const stats = computeSupplyDashboardStats([
      baseEntry({ id: '1', collectionCenterId: 'c1', collectionCenterName: 'Centro A', entryType: 'necesidad', quantity: 10 }),
      baseEntry({ id: '2', collectionCenterId: 'c1', collectionCenterName: 'Centro A', entryType: 'recepcion', quantity: 4 }),
      baseEntry({
        id: '3',
        collectionCenterId: 'c2',
        collectionCenterName: 'Centro B',
        categoryId: 'cat-med',
        categoryName: 'Medicinas',
        itemName: 'Paracetamol',
        entryType: 'necesidad',
        quantity: 5,
      }),
    ]);

    expect(stats).toMatchObject({
      openItems: 2,
      pendingUnits: 11,
      centersWithNeeds: 2,
      surplusItems: 0,
    });
    expect(stats.byCenter[0]).toMatchObject({ centerId: 'c1', openItems: 1, pendingUnits: 6 });
    expect(stats.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryName: 'Insumos', openItems: 1, pendingUnits: 6 }),
        expect.objectContaining({ categoryName: 'Medicinas', openItems: 1, pendingUnits: 5 }),
      ])
    );
  });
});

describe('projectReception', () => {
  it('calcula faltante cuando la recepción no cubre la necesidad', () => {
    const result = projectReception({ needed: 10, received: 4, balance: 6 }, 3);
    expect(result).toMatchObject({
      pendingBefore: 6,
      pendingAfter: 3,
      surplus: 0,
    });
  });

  it('calcula superávit cuando la recepción excede la necesidad', () => {
    const result = projectReception({ needed: 10, received: 4, balance: 6 }, 8);
    expect(result).toMatchObject({
      pendingBefore: 6,
      pendingAfter: 0,
      surplus: 2,
    });
  });

  it('cubre exactamente la necesidad pendiente', () => {
    const result = projectReception({ needed: 10, received: 4, balance: 6 }, 6);
    expect(result).toMatchObject({ pendingAfter: 0, surplus: 0 });
  });
});

describe('entryRegisteredOnDifferentDay', () => {
  it('detects when movement date differs from registration date', () => {
    expect(
      entryRegisteredOnDifferentDay({
        entryDate: '2026-06-28',
        createdAt: '2026-06-30T10:00:00Z',
      })
    ).toBe(true);
    expect(
      entryRegisteredOnDifferentDay({
        entryDate: '2026-06-30',
        createdAt: '2026-06-30T10:00:00Z',
      })
    ).toBe(false);
  });
});
