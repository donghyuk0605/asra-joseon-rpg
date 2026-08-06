import { describe, expect, it } from 'vitest';
import directorSource from './StoryDirector.ts?raw';
import {
  assertStoryBeat,
  storyDomToken,
  storyStepAt,
  type StoryBeat,
} from './StoryDirector';

const sampleBeat: StoryBeat = {
  id: 'osaka-prison-break',
  chapter: 1,
  title: '불탄 포로촌',
  location: '오사카 외항',
  objective: '감시역의 열쇠를 빼앗아라',
  lines: [
    { speaker: '아사라', text: '오늘 밤, 이 창고를 나간다.' },
    { speaker: '포로촌 노인', text: '바다를 건너면 조선이다.' },
  ],
  choices: [
    { id: 'free-prisoners', label: '포로들을 먼저 풀어준다', description: '동료를 얻는다' },
    { id: 'take-ledger', label: '주장의 문서를 훔친다', consequence: '일본 세력의 원한을 산다' },
  ],
};

describe('StoryDirector helpers', () => {
  it('clamps manual dialogue progress and describes the next action', () => {
    const first = storyStepAt(sampleBeat, -12);
    expect(first).toMatchObject({
      index: 0,
      total: 2,
      atEnd: false,
      nextAction: 'advance',
      nextLabel: '다음 대사 2 / 2',
    });
    expect(first.line.speaker).toBe('아사라');

    const last = storyStepAt(sampleBeat, 99);
    expect(last).toMatchObject({
      index: 1,
      atEnd: true,
      nextAction: 'choices',
      nextLabel: '선택하기',
    });
  });

  it('completes a final line immediately when no choice is authored', () => {
    const beat = { ...sampleBeat, choices: [] };
    expect(storyStepAt(beat, 1)).toMatchObject({
      nextAction: 'complete',
      nextLabel: '임무 시작',
    });
  });

  it('creates conservative DOM tokens with a stable fallback', () => {
    expect(storyDomToken(' Osaka / Prison Break! ')).toBe('osaka-prison-break');
    expect(storyDomToken('포로촌 탈출')).toBe('beat');
  });

  it('rejects incomplete chapters and ambiguous choices', () => {
    expect(() => assertStoryBeat({ ...sampleBeat, id: '  ' })).toThrow(/id/);
    expect(() => assertStoryBeat({ ...sampleBeat, chapter: 0 })).toThrow(/positive integer/);
    expect(() => assertStoryBeat({ ...sampleBeat, lines: [] })).toThrow(/at least one line/);
    expect(() => assertStoryBeat({
      ...sampleBeat,
      choices: [
        { id: 'same', label: '첫 번째' },
        { id: 'same', label: '두 번째' },
      ],
    })).toThrow(/duplicated/);
    expect(() => assertStoryBeat({
      ...sampleBeat,
      choices: 'not-an-array' as unknown as StoryBeat['choices'],
    })).toThrow(/must be an array/);
  });
});

describe('StoryDirector browser contract', () => {
  it('builds an accessible modal with stable responsive class hooks', () => {
    expect(directorSource).toContain("setAttribute('role', 'dialog')");
    expect(directorSource).toContain("setAttribute('aria-modal', 'true')");
    expect(directorSource).toContain("setAttribute('aria-labelledby', titleId)");
    expect(directorSource).toContain('story-cinematic__caption');
    expect(directorSource).toContain('story-cinematic__advance');
    expect(directorSource).toContain('story-cinematic__choices');
    expect(directorSource).toContain('story-cinematic__choice');
    expect(directorSource).toContain("advance.dataset.storyAction = 'advance'");
    expect(directorSource).toContain('button.dataset.storyChoice = choice.id');
    expect(directorSource).not.toContain('.innerHTML');
  });

  it('locks the HUD and global game input, then preserves previous state for restoration', () => {
    expect(directorSource).toContain("body.dataset.inputLocked = 'true'");
    expect(directorSource).toContain("body.dataset.cinematic = 'story'");
    expect(directorSource).toContain('hud.inert = true');
    expect(directorSource).toContain("hud.setAttribute('aria-hidden', 'true')");
    expect(directorSource).toContain("hud.classList.add('is-cinematic')");
    expect(directorSource).toContain("this.restoreDataset(body, 'inputLocked'");
    expect(directorSource).toContain("classList.toggle('is-cinematic'");
  });

  it('supports skip, Escape capture, focus return, callbacks, and terminal cleanup', () => {
    expect(directorSource).toContain("event.key === 'Escape'");
    expect(directorSource).toContain('event.stopImmediatePropagation()');
    expect(directorSource).toContain("addEventListener('keydown', this.handleKeyDown, true)");
    expect(directorSource).toContain('element.focus({ preventScroll: true })');
    expect(directorSource).toContain('const focusIsOutside = !this.dom?.root.contains(active)');
    expect(directorSource).toContain('(event.shiftKey ? last : first).focus({ preventScroll: true })');
    expect(directorSource).toContain('this.callbacks.onOpenChange?.(true, beat)');
    expect(directorSource).toContain('this.callbacks.onChoice?.(beat, choice)');
    expect(directorSource).toContain('this.callbacks.onComplete?.(beat, completion)');
    expect(directorSource).toContain('destroy(): void');
  });
});
