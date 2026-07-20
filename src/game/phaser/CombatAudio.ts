export class CombatAudio {
  private context: AudioContext | null = null;

  prime(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume();
  }

  slash(): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(560, now);
    oscillator.frequency.exponentialRampToValueAtTime(125, now + 0.095);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.026, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.12);
  }

  punch(): void {
    const context = this.ready();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(72, now + 0.065);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  impact(critical: boolean): void {
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
    filter.frequency.value = critical ? 230 : 360;
    filter.Q.value = 0.75;
    gain.gain.setValueAtTime(critical ? 0.1 : 0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
    noise.connect(filter).connect(gain).connect(context.destination);
    noise.start(now);

    if (critical) {
      const low = context.createOscillator();
      const lowGain = context.createGain();
      low.type = 'triangle';
      low.frequency.setValueAtTime(92, now);
      low.frequency.exponentialRampToValueAtTime(42, now + 0.12);
      lowGain.gain.setValueAtTime(0.07, now);
      lowGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      low.connect(lowGain).connect(context.destination);
      low.start(now);
      low.stop(now + 0.14);
    }
  }

  private ready(): AudioContext | null {
    if (!this.context) return null;
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }
}
