import { describe, expect, it } from 'vitest';
import { joinMultiValue, parseMultiValue } from './multiValue';

describe('parseMultiValue', () => {
  it('elimina vacíos y espacios', () => {
    expect(parseMultiValue(' Penicilina , , Aspirina ')).toEqual(['Penicilina', 'Aspirina']);
  });

  it('deduplica sin distinguir mayúsculas', () => {
    expect(parseMultiValue('Polen, polen, POLEN')).toEqual(['Polen']);
  });

  it('devuelve arreglo vacío para entrada vacía', () => {
    expect(parseMultiValue('')).toEqual([]);
    expect(parseMultiValue('   ,  , ')).toEqual([]);
  });
});

describe('joinMultiValue', () => {
  it('une ítems con coma y espacio', () => {
    expect(joinMultiValue(['A', 'B'])).toBe('A, B');
  });
});
