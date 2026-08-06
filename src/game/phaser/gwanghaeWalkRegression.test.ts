import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ASSETS } from '../assets/manifest';
import sceneSource from './HuntingScene.ts?raw';

interface GaitMetrics {
  contactXor: number[];
  supportTravel: number[];
  footBaselines: number[];
}

const measureGait = (): GaitMetrics => {
  const atlasPath = fileURLToPath(new URL(`../../../public${ASSETS.gwanghaePrince.path}`, import.meta.url));
  const script = `
from PIL import Image
import json, sys

FRAME = 256
TOP = 218
BOTTOM = 250
atlas = Image.open(sys.argv[1]).convert("RGBA")
if atlas.size != (FRAME * 8, FRAME * 5):
    raise AssertionError(f"expected 2048x1280 atlas, got {atlas.size}")

contact_xor = []
support_travel = []
foot_baselines = []
for row in range(5):
    masks = []
    for column in range(4):
        alpha = atlas.crop((column * FRAME, row * FRAME, (column + 1) * FRAME, (row + 1) * FRAME)).getchannel("A")
        pixels = alpha.load()
        masks.append({(x, y) for y in range(TOP, BOTTOM) for x in range(FRAME) if pixels[x, y] > 16})
        foot_baselines.append(alpha.getbbox()[3])
    contact_xor.append(len(masks[0] ^ masks[2]))
    widths = [max(x for x, _ in mask) - min(x for x, _ in mask) + 1 for mask in masks]
    centers = [sum(x for x, _ in mask) / len(mask) for mask in masks]
    support_travel.append(max(max(widths) - min(widths), max(centers) - min(centers)))

print(json.dumps({"contactXor": contact_xor, "supportTravel": support_travel, "footBaselines": foot_baselines}))
`;
  const result = spawnSync('python3', ['-c', script, atlasPath], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as GaitMetrics;
};

const methodSource = (startMarker: string, endMarker: string) => {
  const start = sceneSource.indexOf(startMarker);
  const end = sceneSource.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return sceneSource.slice(start, end);
};

describe('Gwanghae walk regression', () => {
  it('alternates grounded contacts instead of sliding a nearly frozen lower body', () => {
    const { contactXor, supportTravel, footBaselines } = measureGait();
    const sortedContactXor = [...contactXor].sort((left, right) => left - right);

    expect(
      contactXor.filter((changedPixels) => changedPixels >= 220).length,
      `opposite-contact lower-mask XOR by direction: ${contactXor.join(', ')}`,
    )
      .toBeGreaterThanOrEqual(4);
    expect(
      sortedContactXor[2],
      `median opposite-contact XOR from ${contactXor.join(', ')}`,
    ).toBeGreaterThanOrEqual(250);
    expect(
      supportTravel.filter((travelPixels) => travelPixels >= 4).length,
      `lower support travel by direction: ${supportTravel.map((value) => value.toFixed(1)).join(', ')}`,
    )
      .toBeGreaterThanOrEqual(4);
    expect(footBaselines, `walk frame alpha bottoms: ${footBaselines.join(', ')}`)
      .toEqual(Array.from({ length: 20 }, () => 249));
  });

  it('plays all four authored walk frames at player speed without restarting every render tick', () => {
    const animationMethod = methodSource(
      'private createGwanghaeAnimations(): void',
      'private createBossAnimations(): void',
    );
    const playerWalkStart = animationMethod.indexOf('const playerWalkKey');
    const playerWalkEnd = animationMethod.indexOf('const playerAttackKey', playerWalkStart);
    expect(playerWalkStart).toBeGreaterThanOrEqual(0);
    expect(playerWalkEnd).toBeGreaterThan(playerWalkStart);
    const playerWalkBlock = animationMethod.slice(playerWalkStart, playerWalkEnd);

    expect(animationMethod).toContain('for (let row = 0; row < 5; row += 1)');
    expect(playerWalkBlock).toContain('start: row * 8');
    expect(playerWalkBlock).toContain('end: row * 8 + 3');
    expect(playerWalkBlock).toContain('frameRate: 11');
    expect(playerWalkBlock).toContain('repeat: -1');

    const syncMethod = methodSource(
      'private syncPlayer(delta = 0): void',
      'private syncPlayerEquipmentLayers(): void',
    );
    expect(syncMethod).toContain('const isMoving = visualMovement.moving');
    expect(syncMethod).toContain('this.playPlayerWalkPreservingGait(visual.animationKey)');
    expect(syncMethod).toContain('this.playerSprite.stop().setTexture(visual.textureKey, visual.idleFrame)');

    const gaitMethod = methodSource(
      'private playPlayerWalkPreservingGait(animationKey: string): void',
      'private syncPlayerEquipmentLayers(): void',
    );
    expect(gaitMethod).toContain("currentKey.includes('-walk-')");
    expect(gaitMethod).toContain('this.playerSprite.play(animationKey, true)');
    expect(gaitMethod).toContain('this.playerSprite.anims.getProgress()');
    expect(gaitMethod).toContain('this.playerSprite.anims.setProgress(gaitProgress)');
  });
});
