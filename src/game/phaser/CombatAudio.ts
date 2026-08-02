import type { WeaponElement } from '../simulation/types';

export class CombatAudio {
  private context: AudioContext | null = null;

  prime(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  slash(weight = 1): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(weight >= 3 ? 430 : weight === 2 ? 640 : 560, now);
    oscillator.frequency.exponentialRampToValueAtTime(weight >= 3 ? 72 : 125, now + (weight >= 3 ? 0.135 : 0.095));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(weight >= 3 ? 0.047 : weight === 2 ? 0.032 : 0.026, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (weight >= 3 ? 0.15 : 0.11));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (weight >= 3 ? 0.16 : 0.12));
  }

  punch(weight = 1): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(weight >= 3 ? 125 : weight === 2 ? 210 : 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(72, now + 0.065);
    gain.gain.setValueAtTime(weight >= 3 ? 0.085 : weight === 2 ? 0.064 : 0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  impact(critical: boolean, weight = 1): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.09), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const fade = 1 - index / data.length;
      data[index] = (Math.random() * 2 - 1) * fade * fade;
    }
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = weight >= 3 ? 170 : critical ? 230 : 360;
    filter.Q.value = 0.75;
    gain.gain.setValueAtTime(weight >= 3 ? 0.125 : critical ? 0.1 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(now);

    if (critical || weight >= 3) {
      const low = context.createOscillator();
      const lowGain = context.createGain();
      low.type = 'triangle';
      low.frequency.setValueAtTime(weight >= 3 ? 76 : 92, now);
      low.frequency.exponentialRampToValueAtTime(36, now + 0.12);
      lowGain.gain.setValueAtTime(weight >= 3 ? 0.095 : 0.07, now);
      lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      low.connect(lowGain).connect(context.destination);
      low.start(now);
      low.stop(now + 0.14);
    }
  }

  killConfirm(): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const tone = context.createOscillator();
    const toneGain = context.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(168, now);
    tone.frequency.exponentialRampToValueAtTime(48, now + 0.19);
    toneGain.gain.setValueAtTime(0.075, now);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
    tone.connect(toneGain).connect(context.destination);
    tone.start(now);
    tone.stop(now + 0.22);

    const chime = context.createOscillator();
    const chimeGain = context.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(720, now + 0.025);
    chime.frequency.exponentialRampToValueAtTime(360, now + 0.16);
    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.028, now + 0.035);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    chime.connect(chimeGain).connect(context.destination);
    chime.start(now);
    chime.stop(now + 0.19);
  }

  elemental(element: WeaponElement, secondary = false): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const volume = secondary ? 0.018 : 0.036;
    if (element === 'fire') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(118, now);
      oscillator.frequency.exponentialRampToValueAtTime(52, now + 0.18);
    } else if (element === 'ice') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1_180, now);
      oscillator.frequency.exponentialRampToValueAtTime(340, now + 0.16);
    } else if (element === 'lightning') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1_640, now);
      oscillator.frequency.exponentialRampToValueAtTime(190, now + 0.11);
    } else if (element === 'poison') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(310, now);
      oscillator.frequency.exponentialRampToValueAtTime(92, now + 0.2);
    } else if (element === 'wind') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(780, now);
      oscillator.frequency.exponentialRampToValueAtTime(160, now + 0.18);
    } else if (element === 'earth') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(86, now);
      oscillator.frequency.exponentialRampToValueAtTime(38, now + 0.24);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(460, now);
      oscillator.frequency.exponentialRampToValueAtTime(74, now + 0.22);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (element === 'earth' ? 0.25 : element === 'fire' || element === 'shadow' ? 0.2 : 0.15));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.22);
  }

  private ready(): AudioContext | null {
    if (!this.context) return null;
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
}
