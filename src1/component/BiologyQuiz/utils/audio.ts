class AudioSystem {
    private context: AudioContext | null = null;

    private init() {
        if (!this.context) {
            const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
                this.context = new AudioContextClass();
            }
        }
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    public playCorrect() {
        this.init();
        if (!this.context) return;

        this.playTone(523.25, 'sine', 0, 0.1); // C5
        this.playTone(659.25, 'sine', 0.1, 0.15); // E5
        this.playTone(783.99, 'sine', 0.25, 0.3); // G5
    }

    public playWrong() {
        this.init();
        if (!this.context) return;

        this.playTone(300, 'sawtooth', 0, 0.15);
        this.playTone(250, 'sawtooth', 0.15, 0.25);
    }

    public playAlarm() {
        this.init();
        if (!this.context) return;

        this.playTone(800, 'square', 0, 0.1, 0.3);
        this.playTone(1000, 'square', 0.1, 0.1, 0.3);
    }

    public playGameOver() {
        this.init();
        if (!this.context) return;

        this.playTone(659.25, 'triangle', 0, 0.2); // E5
        this.playTone(587.33, 'triangle', 0.2, 0.2); // D5
        this.playTone(523.25, 'triangle', 0.4, 0.2); // C5
        this.playTone(392.00, 'triangle', 0.6, 0.6); // G4
    }

    private playTone(frequency: number, type: OscillatorType, startTimeOffset: number, duration: number, volume: number = 1.0) {
        if (!this.context) return;

        const osc = this.context.createOscillator();
        const gainNode = this.context.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.context.currentTime + startTimeOffset);

        // Envelope to avoid clicking
        gainNode.gain.setValueAtTime(0, this.context.currentTime + startTimeOffset);
        gainNode.gain.linearRampToValueAtTime(0.1 * volume, this.context.currentTime + startTimeOffset + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + startTimeOffset + duration);

        osc.connect(gainNode);
        gainNode.connect(this.context.destination);

        osc.start(this.context.currentTime + startTimeOffset);
        osc.stop(this.context.currentTime + startTimeOffset + duration);
    }
}

export const audioSystem = new AudioSystem();
