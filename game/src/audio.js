// Synthesised sound effects (WebAudio, no audio files): a sizzle when food hits the grill,
// a chop thunk, a ding when an order is served, a buzz for mistakes, and a soft pop on pickup.
// The context is created lazily on the first user gesture so browsers allow it.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx === null) {
      try {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        ctx = new AC();
      } catch {
        ctx = null;
      }
    }
    if (ctx !== null && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const c = ensure();
    if (c === null || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, filterFreq) {
    const c = ensure();
    if (c === null || muted) return;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(c.destination);
    src.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(520, 0.07, 'sine', 0.12);
    },
    place() {
      tone(340, 0.08, 'triangle', 0.14);
    },
    chop() {
      noise(0.09, 0.25, 900);
      tone(140, 0.08, 'square', 0.1);
    },
    sizzle() {
      noise(0.5, 0.16, 4200);
    },
    ding() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1318, 0.2, 'sine', 0.14, 0.1);
    },
    coin() {
      tone(988, 0.09, 'sine', 0.14);
      tone(1319, 0.16, 'sine', 0.12, 0.08);
    },
    buzz() {
      tone(160, 0.18, 'sawtooth', 0.1);
    },
    burn() {
      noise(0.3, 0.2, 300);
      tone(110, 0.25, 'sawtooth', 0.1);
    },
    tick() {
      tone(1050, 0.04, 'sine', 0.07);
    },
  };
}
