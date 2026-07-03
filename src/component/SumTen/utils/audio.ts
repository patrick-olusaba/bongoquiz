class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public muted: boolean = false;
  private unlocked: boolean = false;

  init() {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.3; // Global volume
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  unlock() {
    this.init();
    if (!this.unlocked && this.ctx && this.masterGain) {
      // Play a silent short tone to force audio unlock on mobile/Safari
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
      this.unlocked = true;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
    return this.muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 1, slideToFreq?: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSelect() {
    this.init();
    this.playTone(600, 'sine', 0.1, 0.5);
  }

  playMatchSuccess() {
    this.init();
    setTimeout(() => this.playTone(400, 'sine', 0.1, 0.5), 0);
    setTimeout(() => this.playTone(600, 'sine', 0.15, 0.5), 100);
    setTimeout(() => this.playTone(800, 'sine', 0.3, 0.6), 200);
  }

  playMatchFail() {
    this.init();
    this.playTone(200, 'sawtooth', 0.2, 0.3, 100);
  }

  playLevelComplete() {
    this.init();
    const notes = [
      { freq: 440, delay: 0 },
      { freq: 554.37, delay: 150 },
      { freq: 659.25, delay: 300 },
      { freq: 880, delay: 450 },
    ];

    notes.forEach(note => {
      setTimeout(() => {
        this.playTone(note.freq, 'sine', note.delay === 450 ? 0.6 : 0.2, 0.6);
      }, note.delay);
    });
  }
}

export const audio = new AudioController();
