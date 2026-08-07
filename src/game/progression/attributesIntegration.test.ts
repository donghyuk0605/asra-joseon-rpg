import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../simulation/GameSimulation';

describe('attribute progression integration', () => {
  it('changes combat stats, refunds allocations, and survives a save round trip', () => {
    const game = new GameSimulation();
    const attackBefore = game.getAttackPower();
    const hpBefore = game.player.maxHp;

    game.allocateAttribute('strength');
    game.allocateAttribute('vitality');
    expect(game.getAttackPower()).toBeGreaterThan(attackBefore);
    expect(game.player.maxHp).toBe(hpBefore + 8);
    expect(game.getAttributeState().allocations).toMatchObject({ strength: 1, vitality: 1 });

    const restored = new GameSimulation();
    restored.importSinglePlayerSnapshot(game.exportSinglePlayerSnapshot());
    expect(restored.getAttributeState()).toEqual(game.getAttributeState());
    expect(restored.player.maxHp).toBe(game.player.maxHp);

    restored.resetAttributes();
    expect(restored.getAttributeState().allocations).toMatchObject({ strength: 0, vitality: 0 });
    expect(restored.player.maxHp).toBe(hpBefore);
  });
});
