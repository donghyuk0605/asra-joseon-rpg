import { describe, expect, it } from 'vitest';
import {
  completeStoryBeat,
  createStoryBeat,
  createStoryCampaignState,
  hasSeenStoryBeat,
  normalizeStoryCampaignState,
} from './StoryCampaign';
import type { PlayerOrigin } from '../simulation/types';

const origins: PlayerOrigin[] = [
  'kim-donghyeok', 'frontier-archer', 'osaka-mudang', 'gwanghae-prince',
];

describe('StoryCampaign', () => {
  it('creates a separate serializable chronicle for every protagonist', () => {
    for (const origin of origins) {
      expect(createStoryCampaignState(origin)).toEqual({
        version: 1, origin, seenBeatIds: [], memories: [], choices: [],
      });
    }
  });

  it('turns the existing stage signal into a four-beat playable scene', () => {
    const beat = createStoryBeat('frontier-archer', {
      chapter: 8,
      completed: 7,
      title: '하진 제8장 · 압록 설욕전',
      objective: '조선 국경 지휘부를 무너뜨리십시오.',
    }, '압록 얼음 나루');
    expect(beat.act).toBe(3);
    expect(beat.lines).toHaveLength(4);
    expect(beat.lines.map((line) => line.tone)).toEqual(['narrator', 'ally', 'hero', 'objective']);
    expect(beat.lines[2].text).toContain('세 부족의 이름');
  });

  it('names Yeonhwa as a Joseon piroin mudang rather than a Japanese shrine maiden', () => {
    const beat = createStoryBeat('osaka-mudang', {
      chapter: 1,
      completed: 0,
      title: '연화 제1장 · 타향의 초혼',
      objective: '포로촌의 문을 여십시오.',
    }, '오사카 포로촌');
    const copy = JSON.stringify(beat);
    expect(copy).toContain('조선인 피로인');
    expect(copy).toContain('무당 연화');
    expect(copy).not.toContain('무녀');
  });

  it('records a turning-point choice once and keeps the scene idempotent', () => {
    const beat = createStoryBeat('kim-donghyeok', {
      chapter: 5,
      completed: 4,
      title: '제5장 · 검은 돛의 침공',
      objective: '왜구 선단을 막으십시오.',
    }, '울릉 관아');
    expect(beat.choices).toHaveLength(2);
    const first = completeStoryBeat(createStoryCampaignState('kim-donghyeok'), beat, beat.choices[0]);
    const second = completeStoryBeat(first, beat, beat.choices[1]);
    expect(hasSeenStoryBeat(second, beat.id)).toBe(true);
    expect(second.memories).toHaveLength(1);
    expect(second.choices).toHaveLength(1);
    expect(second.choices[0].choiceId).toBe('publish-ledger');
  });

  it('rejects cross-character state and bounds untrusted save arrays', () => {
    const wrong = normalizeStoryCampaignState({
      version: 1,
      origin: 'osaka-mudang',
      seenBeatIds: ['foreign'],
    }, 'kim-donghyeok');
    expect(wrong).toEqual(createStoryCampaignState('kim-donghyeok'));

    const bounded = normalizeStoryCampaignState({
      version: 1,
      origin: 'kim-donghyeok',
      seenBeatIds: Array.from({ length: 140 }, (_, index) => `beat-${index}`),
      memories: [],
      choices: [],
    }, 'kim-donghyeok');
    expect(bounded.seenBeatIds).toHaveLength(96);
  });
});
