import { describe, expect, it } from 'vitest';
import { readStoredListViewMode } from './listViewMode';

describe('listViewMode', () => {
  it('defaults to cards when storage is empty', () => {
    expect(readStoredListViewMode('test_scope', 'cards')).toBe('cards');
  });
});
