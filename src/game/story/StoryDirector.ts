export type StoryLine = Readonly<{
  speaker: string;
  text: string;
}>;

export type StoryChoice = Readonly<{
  id: string;
  label: string;
  description?: string;
  consequence?: string;
}>;

export type StoryBeat = Readonly<{
  id: string;
  chapter: number;
  title: string;
  location: string;
  objective: string;
  lines: readonly StoryLine[];
  choices?: readonly StoryChoice[];
}>;

export type StoryCompletion = Readonly<{
  skipped: boolean;
  choiceId: string | null;
}>;

export type StoryDirectorCallbacks = Readonly<{
  onOpenChange?: (open: boolean, beat: StoryBeat) => void;
  onComplete?: (beat: StoryBeat, completion: StoryCompletion) => void;
  onChoice?: (beat: StoryBeat, choice: StoryChoice) => void;
}>;

export type StoryStep = Readonly<{
  index: number;
  total: number;
  line: StoryLine;
  atEnd: boolean;
  nextAction: 'advance' | 'choices' | 'complete';
  nextLabel: string;
}>;

type StoryDom = {
  root: HTMLElement;
  title: HTMLElement;
  speaker: HTMLElement;
  line: HTMLElement;
  progress: HTMLElement;
  advance: HTMLButtonElement;
  choices: HTMLElement;
};

type HudSnapshot = {
  element: HTMLElement;
  inert: boolean;
  ariaHidden: string | null;
  hadCinematicClass: boolean;
};

type BodySnapshot = {
  inputLocked: string | undefined;
  cinematic: string | undefined;
};

function requireNonBlank(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`StoryBeat.${field} must be a non-empty string.`);
  }
}

/** Validate authored story data before it can lock player input. */
export function assertStoryBeat(beat: StoryBeat): void {
  if (!beat || typeof beat !== 'object') {
    throw new TypeError('StoryBeat must be an object.');
  }

  requireNonBlank(beat.id, 'id');
  requireNonBlank(beat.title, 'title');
  requireNonBlank(beat.location, 'location');
  requireNonBlank(beat.objective, 'objective');

  if (!Number.isInteger(beat.chapter) || beat.chapter < 1) {
    throw new TypeError('StoryBeat.chapter must be a positive integer.');
  }

  if (!Array.isArray(beat.lines) || beat.lines.length === 0) {
    throw new TypeError('StoryBeat.lines must contain at least one line.');
  }

  beat.lines.forEach((line, index) => {
    if (!line || typeof line !== 'object') {
      throw new TypeError(`StoryBeat.lines[${index}] must be an object.`);
    }
    requireNonBlank(line.speaker, `lines[${index}].speaker`);
    requireNonBlank(line.text, `lines[${index}].text`);
  });

  if (beat.choices !== undefined && !Array.isArray(beat.choices)) {
    throw new TypeError('StoryBeat.choices must be an array when provided.');
  }

  const choiceIds = new Set<string>();
  for (const [index, choice] of (beat.choices ?? []).entries()) {
    if (!choice || typeof choice !== 'object') {
      throw new TypeError(`StoryBeat.choices[${index}] must be an object.`);
    }
    requireNonBlank(choice.id, `choices[${index}].id`);
    requireNonBlank(choice.label, `choices[${index}].label`);
    if (choiceIds.has(choice.id)) {
      throw new TypeError(`StoryBeat choice id "${choice.id}" is duplicated.`);
    }
    choiceIds.add(choice.id);
  }
}

/** Produce a conservative token suitable for generated DOM ids and datasets. */
export function storyDomToken(id: string): string {
  const token = id
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return token || 'beat';
}

/** Resolve line progress without requiring a browser DOM (also useful to save/restore progress). */
export function storyStepAt(beat: StoryBeat, requestedIndex: number): StoryStep {
  assertStoryBeat(beat);
  const total = beat.lines.length;
  const safeRequestedIndex = Number.isFinite(requestedIndex) ? Math.trunc(requestedIndex) : 0;
  const index = Math.min(total - 1, Math.max(0, safeRequestedIndex));
  const atEnd = index === total - 1;
  const hasChoices = (beat.choices?.length ?? 0) > 0;

  return {
    index,
    total,
    line: beat.lines[index],
    atEnd,
    nextAction: atEnd ? (hasChoices ? 'choices' : 'complete') : 'advance',
    nextLabel: atEnd ? (hasChoices ? '선택하기' : '임무 시작') : `다음 대사 ${index + 2} / ${total}`,
  };
}

/**
 * Browser-only story curtain. The module itself is safe to import in Vitest's
 * node environment; a Document is only required when an instance is created.
 */
export class StoryDirector {
  private beat: StoryBeat | null = null;
  private lineIndex = 0;
  private dom: StoryDom | null = null;
  private previousFocus: HTMLElement | null = null;
  private hudSnapshot: HudSnapshot | null = null;
  private bodySnapshot: BodySnapshot | null = null;
  private destroyed = false;

  constructor(
    private readonly callbacks: StoryDirectorCallbacks = {},
    private readonly ownerDocument: Document = document,
  ) {}

  get isOpen(): boolean {
    return this.beat !== null;
  }

  get activeBeat(): StoryBeat | null {
    return this.beat;
  }

  play(beat: StoryBeat): boolean {
    assertStoryBeat(beat);
    if (this.destroyed || this.isOpen) return false;

    this.beat = beat;
    this.lineIndex = 0;
    const activeElement = this.ownerDocument.activeElement;
    const HTMLElementConstructor = this.ownerDocument.defaultView?.HTMLElement;
    this.previousFocus = HTMLElementConstructor && activeElement instanceof HTMLElementConstructor
      ? activeElement
      : null;
    this.lockGameInput();

    try {
      this.dom = this.createDom(beat);
      this.ownerDocument.body.appendChild(this.dom.root);
      this.dom.root.addEventListener('click', this.handleClick);
      this.ownerDocument.defaultView?.addEventListener('keydown', this.handleKeyDown, true);
      this.renderLine();
      this.callbacks.onOpenChange?.(true, beat);
      this.focusElement(this.dom.advance);
      return true;
    } catch (error) {
      this.teardown(beat);
      throw error;
    }
  }

  advance(): void {
    if (!this.beat || !this.dom) return;

    const step = storyStepAt(this.beat, this.lineIndex);
    if (!step.atEnd) {
      this.lineIndex += 1;
      this.renderLine();
      return;
    }

    if (step.nextAction === 'choices') {
      this.showChoices();
      return;
    }

    this.finish({ skipped: false, choiceId: null });
  }

  skip(): void {
    if (!this.beat) return;
    this.finish({ skipped: true, choiceId: null });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    const beat = this.beat;
    if (beat) this.teardown(beat);
  }

  private createDom(beat: StoryBeat): StoryDom {
    const doc = this.ownerDocument;
    const token = storyDomToken(beat.id);
    const titleId = `story-${token}-title`;
    const objectiveId = `story-${token}-objective`;
    const lineId = `story-${token}-line`;

    const root = doc.createElement('section');
    root.className = 'story-cinematic opening-cinematic';
    root.dataset.storyBeat = beat.id;
    root.dataset.storyChapter = String(beat.chapter);
    root.dataset.storyPhase = 'lines';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', titleId);
    root.setAttribute('aria-describedby', `${objectiveId} ${lineId}`);
    root.tabIndex = -1;
    // The legacy opening curtain disables pointer events at the root.
    // Re-enable them so the modal also blocks clicks from reaching Phaser.
    root.style.pointerEvents = 'auto';

    const veil = doc.createElement('div');
    veil.className = 'story-cinematic__veil';
    veil.setAttribute('aria-hidden', 'true');

    const location = doc.createElement('div');
    location.className = 'story-cinematic__location opening-cinematic__location';
    location.textContent = `제${beat.chapter}장 · ${beat.location}`;

    const skip = doc.createElement('button');
    skip.className = 'story-cinematic__skip opening-cinematic__skip';
    skip.type = 'button';
    skip.dataset.storyAction = 'skip';
    skip.setAttribute('aria-label', '이야기 건너뛰기');
    skip.textContent = '건너뛰기 〉';

    const caption = doc.createElement('div');
    caption.className = 'story-cinematic__caption opening-cinematic__caption';
    caption.setAttribute('aria-live', 'polite');
    caption.setAttribute('aria-atomic', 'true');

    const title = doc.createElement('strong');
    title.className = 'story-cinematic__title';
    title.id = titleId;
    title.textContent = beat.title;

    const speaker = doc.createElement('strong');
    speaker.className = 'story-cinematic__speaker opening-cinematic__speaker';

    const line = doc.createElement('p');
    line.className = 'story-cinematic__line opening-cinematic__line';
    line.id = lineId;

    const objective = doc.createElement('p');
    objective.className = 'story-cinematic__objective';
    objective.id = objectiveId;
    objective.textContent = `목표 · ${beat.objective}`;

    const progress = doc.createElement('span');
    progress.className = 'story-cinematic__progress';
    progress.setAttribute('aria-hidden', 'true');

    const advance = doc.createElement('button');
    advance.className = 'story-cinematic__advance opening-cinematic__advance';
    advance.type = 'button';
    advance.dataset.storyAction = 'advance';

    const choices = doc.createElement('div');
    choices.className = 'story-cinematic__choices';
    choices.dataset.storyChoices = '';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', '이야기 선택지');
    choices.hidden = true;

    for (const choice of beat.choices ?? []) {
      const button = doc.createElement('button');
      button.className = 'story-cinematic__choice';
      button.type = 'button';
      button.dataset.storyChoice = choice.id;

      const label = doc.createElement('strong');
      label.className = 'story-cinematic__choice-label';
      label.textContent = choice.label;
      button.appendChild(label);

      if (choice.description) {
        const description = doc.createElement('span');
        description.className = 'story-cinematic__choice-description';
        description.textContent = choice.description;
        button.appendChild(description);
      }
      if (choice.consequence) {
        const consequence = doc.createElement('small');
        consequence.className = 'story-cinematic__choice-consequence';
        consequence.textContent = choice.consequence;
        button.appendChild(consequence);
      }
      choices.appendChild(button);
    }

    caption.append(title, speaker, line, objective, progress, choices, advance);
    root.append(veil, location, skip, caption);
    return { root, title, speaker, line, progress, advance, choices };
  }

  private renderLine(): void {
    if (!this.beat || !this.dom) return;
    const step = storyStepAt(this.beat, this.lineIndex);
    this.dom.root.dataset.storyStep = String(step.index + 1);
    this.dom.speaker.textContent = step.line.speaker;
    this.dom.line.textContent = step.line.text;
    this.dom.progress.textContent = `${step.index + 1} / ${step.total}`;
    this.dom.advance.textContent = step.nextLabel;
    this.dom.line.classList.remove('is-changing');
    void this.dom.line.offsetWidth;
    this.dom.line.classList.add('is-changing');
  }

  private showChoices(): void {
    if (!this.dom) return;
    this.dom.root.dataset.storyPhase = 'choices';
    this.dom.advance.hidden = true;
    this.dom.choices.hidden = false;
    const firstChoice = this.dom.choices.querySelector<HTMLButtonElement>('[data-story-choice]');
    if (firstChoice) this.focusElement(firstChoice);
  }

  private choose(choiceId: string): void {
    const beat = this.beat;
    if (!beat) return;
    const choice = beat.choices?.find((candidate) => candidate.id === choiceId);
    if (!choice) return;

    try {
      this.callbacks.onChoice?.(beat, choice);
    } finally {
      this.finish({ skipped: false, choiceId: choice.id });
    }
  }

  private finish(completion: StoryCompletion): void {
    const beat = this.beat;
    if (!beat) return;
    try {
      this.teardown(beat);
    } finally {
      // Completion is terminal and must be reported even when another close
      // observer fails after the director has restored the game UI.
      this.callbacks.onComplete?.(beat, completion);
    }
  }

  private teardown(beat: StoryBeat): void {
    const dom = this.dom;
    if (dom) {
      dom.root.removeEventListener('click', this.handleClick);
      dom.root.remove();
    }
    this.ownerDocument.defaultView?.removeEventListener('keydown', this.handleKeyDown, true);

    this.dom = null;
    this.beat = null;
    this.lineIndex = 0;
    this.unlockGameInput();

    const focusTarget = this.previousFocus;
    this.previousFocus = null;
    if (focusTarget?.isConnected) this.focusElement(focusTarget);
    this.callbacks.onOpenChange?.(false, beat);
  }

  private lockGameInput(): void {
    const body = this.ownerDocument.body;
    this.bodySnapshot = {
      inputLocked: body.dataset.inputLocked,
      cinematic: body.dataset.cinematic,
    };
    body.dataset.inputLocked = 'true';
    body.dataset.cinematic = 'story';

    const hud = this.ownerDocument.querySelector<HTMLElement>('#hud');
    if (!hud) return;
    this.hudSnapshot = {
      element: hud,
      inert: hud.inert,
      ariaHidden: hud.getAttribute('aria-hidden'),
      hadCinematicClass: hud.classList.contains('is-cinematic'),
    };
    hud.inert = true;
    hud.setAttribute('aria-hidden', 'true');
    hud.classList.add('is-cinematic');
  }

  private unlockGameInput(): void {
    const body = this.ownerDocument.body;
    if (this.bodySnapshot) {
      this.restoreDataset(body, 'inputLocked', this.bodySnapshot.inputLocked);
      this.restoreDataset(body, 'cinematic', this.bodySnapshot.cinematic);
      this.bodySnapshot = null;
    }

    if (this.hudSnapshot) {
      const snapshot = this.hudSnapshot;
      snapshot.element.inert = snapshot.inert;
      if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
      else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
      snapshot.element.classList.toggle('is-cinematic', snapshot.hadCinematicClass);
      this.hudSnapshot = null;
    }
  }

  private restoreDataset(element: HTMLElement, key: 'inputLocked' | 'cinematic', value: string | undefined): void {
    if (value === undefined) delete element.dataset[key];
    else element.dataset[key] = value;
  }

  private focusElement(element: HTMLElement): void {
    const focus = () => {
      if (element.isConnected) element.focus({ preventScroll: true });
    };
    const view = this.ownerDocument.defaultView;
    if (view?.requestAnimationFrame) view.requestAnimationFrame(focus);
    else focus();
  }

  private focusableButtons(): HTMLButtonElement[] {
    if (!this.dom) return [];
    return Array.from(this.dom.root.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
      .filter((button) => !button.hidden && !button.closest('[hidden]'));
  }

  private readonly handleClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const target = event.target as Element | null;
    const action = target?.closest<HTMLElement>('[data-story-action]')?.dataset.storyAction;
    if (action === 'skip') {
      this.skip();
      return;
    }
    if (action === 'advance') {
      this.advance();
      return;
    }

    const choiceId = target?.closest<HTMLButtonElement>('[data-story-choice]')?.dataset.storyChoice;
    if (choiceId) this.choose(choiceId);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.skip();
      return;
    }

    if (event.key !== 'Tab') return;
    const buttons = this.focusableButtons();
    if (buttons.length === 0) {
      event.preventDefault();
      this.dom?.root.focus({ preventScroll: true });
      return;
    }

    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = this.ownerDocument.activeElement;
    const focusIsOutside = !this.dom?.root.contains(active);
    if (focusIsOutside) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };
}
