import { describe, expect, it } from 'vitest';
import { clampPageSize, paginate } from './pagination';

describe('pagination', () => {
  it('limita el tamaño de página entre 10 y 30', () => {
    expect(clampPageSize(9)).toBe(10);
    expect(clampPageSize(10)).toBe(10);
    expect(clampPageSize(30)).toBe(30);
    expect(clampPageSize(45)).toBe(30);
    expect(clampPageSize(Number.NaN)).toBe(10);
  });

  it('pagina con el tamaño elegido', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const page1 = paginate(items, 1, 10);
    expect(page1.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page1.totalPages).toBe(3);

    const page3 = paginate(items, 3, 10);
    expect(page3.pageItems).toEqual([21, 22, 23, 24, 25]);
    expect(page3.startIndex).toBe(21);
    expect(page3.endIndex).toBe(25);
  });
});
