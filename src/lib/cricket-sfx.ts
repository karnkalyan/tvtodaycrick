/**
 * Dynamic Web Audio API Sound Effects Synthesizer for NPL Cricket Broadcasts.
 * Produces bold, broadcast-grade delivery stingers and impacts directly in the browser
 * without depending on external asset downloads.
 */

type DeliveryEventType =
  | "dot"
  | "run1"
  | "run2"
  | "run3"
  | "four"
  | "six"
  | "wicket"
  | "wide"
  | "noBall";

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function unlockAudioContext(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/**
 * Plays a bold, event-tailored synthesized broadcast sound effect.
 */
export function playCricketSfx(type: DeliveryEventType): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;

  switch (type) {
    case "six": {
      // 1. Deep Sub Impact / Bat-cannon blast
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.38);
      subGain.gain.setValueAtTime(0.7, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.45);

      // 2. High-energy celebratory rising fanfare arpeggio (C5 -> E5 -> G5 -> C6)
      const fanfareNotes = [523.25, 659.25, 783.99, 1046.5];
      fanfareNotes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = "triangle";
        noteOsc.frequency.setValueAtTime(freq, now + 0.08 * idx);
        noteGain.gain.setValueAtTime(0.001, now + 0.08 * idx);
        noteGain.gain.linearRampToValueAtTime(0.35, now + 0.08 * idx + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * idx + (idx === 3 ? 0.95 : 0.45));
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.start(now + 0.08 * idx);
        noteOsc.stop(now + 0.08 * idx + 1.0);
      });
      break;
    }

    case "four": {
      // 1. Crisp bat-crack impact
      const crackOsc = ctx.createOscillator();
      const crackGain = ctx.createGain();
      crackOsc.type = "sawtooth";
      crackOsc.frequency.setValueAtTime(340, now);
      crackOsc.frequency.exponentialRampToValueAtTime(75, now + 0.12);
      crackGain.gain.setValueAtTime(0.55, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      crackOsc.connect(crackGain);
      crackGain.connect(ctx.destination);
      crackOsc.start(now);
      crackOsc.stop(now + 0.15);

      // 2. Bright celebratory boundary dual-chime
      [880, 1318.51].forEach((freq, idx) => {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = "sine";
        const delay = 0.08 + idx * 0.12;
        chime.frequency.setValueAtTime(freq, now + delay);
        chimeGain.gain.setValueAtTime(0.38, now + delay);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.75);
        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(now + delay);
        chime.stop(now + delay + 0.8);
      });
      break;
    }

    case "wicket": {
      // 1. Heavy resonant strike gong
      const gongOsc = ctx.createOscillator();
      const gongGain = ctx.createGain();
      gongOsc.type = "triangle";
      gongOsc.frequency.setValueAtTime(165, now);
      gongOsc.frequency.exponentialRampToValueAtTime(42, now + 0.65);
      gongGain.gain.setValueAtTime(0.75, now);
      gongGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      gongOsc.connect(gongGain);
      gongGain.connect(ctx.destination);
      gongOsc.start(now);
      gongOsc.stop(now + 0.75);

      // 2. Dramatic descending siren stinger
      const stingOsc = ctx.createOscillator();
      const stingGain = ctx.createGain();
      stingOsc.type = "sawtooth";
      stingOsc.frequency.setValueAtTime(440, now + 0.05);
      stingOsc.frequency.exponentialRampToValueAtTime(146.83, now + 0.58);
      stingGain.gain.setValueAtTime(0.3, now + 0.05);
      stingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      stingOsc.connect(stingGain);
      stingGain.connect(ctx.destination);
      stingOsc.start(now + 0.05);
      stingOsc.stop(now + 0.65);
      break;
    }

    case "dot": {
      // Short, dry willow defensive block click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(185, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }

    case "run1": {
      // Single bright melodic confirmation pip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case "run2": {
      // Cheerful two-tone chime
      [783.99, 987.77].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const delay = idx * 0.11;
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.32, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.38);
      });
      break;
    }

    case "run3": {
      // Swift three-tone ascending flourish
      [659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const delay = idx * 0.1;
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.32, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.38);
      });
      break;
    }

    case "wide": {
      // Wobble / warning tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(410, now + 0.12);
      osc.frequency.linearRampToValueAtTime(440, now + 0.24);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }

    case "noBall": {
      // High-low alarm siren klaxon
      [880, 660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        const delay = idx * 0.1;
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.22, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.16);
      });
      break;
    }
  }
}
