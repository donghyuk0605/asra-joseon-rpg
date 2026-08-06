import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sceneSource = readFileSync(new URL('./HuntingScene.ts', import.meta.url), 'utf8');

describe('village farm scene integration', () => {
  it('connects walking farmers to repeated real work animations', () => {
    expect(sceneSource).toContain("role: 'farmer'");
    expect(sceneSource).toContain('`npc-walk-${mode}-${row}`');
    expect(sceneSource).toContain('`npc-work-${mode}-${row}`');
    expect(sceneSource).toContain('this.syncFarmer(npc, deltaMs)');
  });

  it('makes completed work alter the visible crop plot instead of acting as decoration only', () => {
    expect(sceneSource).toContain('advanceFarmPlotStage(plot.stage, npc.farmWork)');
    expect(sceneSource).toContain('this.updateFarmPlotView(plot)');
    expect(sceneSource).toContain('plot.sprite.setFrame(FARM_PLOT_FRAME_BY_STAGE[plot.stage])');
  });

  it('renders each field as one staged image-set object instead of procedural soil and crop shapes', () => {
    expect(sceneSource).toContain('ASSETS.props.villageFarmPlotStages.key');
    expect(sceneSource).toContain('frameWidth: 512, frameHeight: 512, endFrame: 3');
    expect(sceneSource).not.toContain('type FarmCropView');
    expect(sceneSource).not.toContain('crop.grain.setVisible');
  });
});
