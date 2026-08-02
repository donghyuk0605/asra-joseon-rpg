import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('online citadel presentation and integration', () => {
  const html = readFileSync('index.html', 'utf8');
  const main = readFileSync('src/main.ts', 'utf8');
  const styles = readFileSync('src/styles.css', 'utf8');
  const controller = readFileSync('src/game/online/OnlineCitadel.ts', 'utf8');

  it('opens an online-only hub with duel and marketplace facilities', () => {
    expect(html).toContain('id="online-citadel"');
    expect(html).toContain('data-online-tab="arena"');
    expect(html).toContain('data-online-tab="market"');
    expect(html).toContain('data-duel-action="queue"');
    expect(html).toContain('data-market-sell-form');
    expect(main).toContain("import('./game/online/OnlineCitadel')");
    expect(main).toContain('openOnlineCitadel()');
  });

  it('connects authoritative duel controls and labels the marketplace as proposals', () => {
    expect(controller).toContain("queueDuel('donghyeok')");
    expect(controller).toContain('publishDuelInput(');
    expect(controller).toContain("message.type === 'duel-snapshot'");
    expect(html).toContain('제안 등록·예약·취소만 기록합니다');
    expect(controller).toContain("'firestore-proposal'");
  });

  it('clears stale marketplace details after a selected offer disappears', () => {
    expect(controller).toContain('this.selectedOfferId = \'\';');
    expect(controller).toContain("this.renderMarketDetail(\n        this.selectedOfferId");
    expect(controller).toContain(': null,\n      );');
  });

  it('clears the previous result before entering a rematch', () => {
    expect(controller).toContain("this.resetDuel('대련 접수를 준비합니다');");
    expect(controller).toContain("this.element<HTMLElement>('[data-duel-result]').setAttribute('hidden', '');");
  });

  it('has a dedicated compact mobile layout without covering the entire interface', () => {
    expect(styles).toContain('@media (max-width: 900px)');
    expect(styles).toContain('.online-citadel__nav { display: grid; grid-template-columns: 1fr 1fr;');
    expect(styles).toContain('.online-market__body { min-height: 0; grid-template-columns: 1fr; }');
    expect(styles).toContain('.online-market__detail.has-offer { position: fixed;');
    expect(controller).toContain("if (marketAction === 'close-detail') this.closeMarketDetail();");
  });
});
