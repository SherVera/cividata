import { describe, expect, it } from 'vitest';
import {
  aggregateSupplyBalances,
  formatQty,
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
