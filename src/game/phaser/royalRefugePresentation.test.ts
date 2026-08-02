import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import sceneSource from './HuntingScene.ts?raw';
import hudSource from '../ui/Hud.ts?raw';

const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

describe('royal refuge presentation', () => {
  it('routes Pyongyang through the palace entrance instead of teleporting to the royal chamber', () => {
    expect(sceneSource).toContain(
      "routePlaque('pyongyanginner', 768, 890, '한성 북로 · 경복궁 광화문', 'gyeongbokgate'",
    );
    expect(sceneSource).not.toContain(
      "routePlaque('pyongyanginner', 768, 890, '한성 북로 · 경복궁 내전', 'gyeongbokinner'",
    );
  });

  it('renders the king at human scale with a royal character atlas', () => {
    expect(sceneSource).toContain("ASSETS.monsters['joseon-prince'].key, 16");
    expect(sceneSource).toContain('.setScale(0.50)');
    expect(sceneSource).toContain("king.setFlipX(direction < 0).play('monster-walk-joseon-prince-2', true)");
    expect(sceneSource).toContain('this.time.delayedCall(1900, () => paceKing(');
    expect(sceneSource).not.toContain(
      "const king = this.add.sprite(royalX, royalY, ASSETS.monsters['ulleung-magistrate'].key",
    );
  });

  it('loads only the selected refuge and presents a manually paced two-route decision', () => {
    expect(sceneSource).toContain('private loadRoyalRefugeWorld(');
    expect(sceneSource).toContain('다음 대사');
    expect(sceneSource).toContain('data-refuge-route=');
    expect(sceneSource).toContain('ASSETS.namhansanFortressBackground');
    expect(sceneSource).toContain('ASSETS.ganghwaFortressBackground');
    expect(sceneSource).toContain('this.simulation.chooseRoyalRefugeRoute(routeId)');
    expect(styles).toContain('.royal-refuge-cinematic__choices');
    expect(styles).toContain('@media (max-width: 640px)');
  });

  it('shows all three defense tiers in the HUD and gate presentation', () => {
    expect(sceneSource).toContain('제1선 외곽 방어진  →  제2선 중성  →  제3선 왕실 행궁');
    expect(sceneSource).toContain('private syncRoyalRefugeGates');
    expect(hudSource).toContain('남한산성 또는 강화도의 세 겹 최종 방어선을 돌파');
    expect(hudSource).toContain('갑곶나루 → 강화산성 → 행궁');
  });
});
