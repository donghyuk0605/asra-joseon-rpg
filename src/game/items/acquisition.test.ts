import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from './catalog';
import { itemAcquisitionInfo } from './acquisition';

describe('item acquisition codex', () => {
  it('describes an acquisition path for every catalog item', () => {
    for (const itemId of Object.keys(ITEM_CATALOG) as Array<keyof typeof ITEM_CATALOG>) {
      const info = itemAcquisitionInfo(itemId);
      expect(info.primary.length, itemId).toBeGreaterThan(2);
      expect(info.detail.length, itemId).toBeGreaterThan(5);
      expect(info.primary, itemId).not.toBe('지역 토벌·사건 보상');
    }
  });

  it('derives every Episode II source region from the live drop pools', () => {
    expect(itemAcquisitionInfo('hwangju-moonsteel-spear').regions).toEqual(
      expect.arrayContaining(['hwangju', 'anju', 'yangju']),
    );
    expect(itemAcquisitionInfo('tongyeong-signal-drum').regions).toEqual(
      expect.arrayContaining(['samcheok', 'jemulpo', 'tongyeong']),
    );
  });

  it('keeps fixed rewards explicit instead of pretending they are generic drops', () => {
    expect(itemAcquisitionInfo('worn-hwando').detail).toContain('첫 포졸');
    expect(itemAcquisitionInfo('tiger-pelt-armor').detail).toContain('호피 3장');
    expect(itemAcquisitionInfo('crescent-manual').detail).toContain('확정 드랍');
  });
});
