import { describe, expect, it } from 'vitest';
import { withObjectParticle } from './koreanGrammar';

describe('withObjectParticle', () => {
  it('uses 를 after an open Hangul syllable', () => {
    expect(withObjectParticle('승정원 주서')).toBe('승정원 주서를');
    expect(withObjectParticle('수원 군관 나리')).toBe('수원 군관 나리를');
  });

  it('uses 을 after a closed Hangul syllable', () => {
    expect(withObjectParticle('안동 유생')).toBe('안동 유생을');
    expect(withObjectParticle('충주 순라군')).toBe('충주 순라군을');
  });
});
