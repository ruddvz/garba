/**
 * Cultural earcons for PlayGarba.
 * High-fidelity Web Audio synthesized folk instruments:
 * - Manjira (Bronze hand cymbals)
 * - Dhol (Resonant double-headed folk drum)
 * - Taali / Dandiya (Garba hand claps and polished wooden stick strikes)
 */
(() => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let isUnlocked = false;

  function getContext() {
    if (!ctx && AudioContextClass) {
      ctx = new AudioContextClass();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function unlock() {
    if (isUnlocked) return;
    const c = getContext();
    if (c) {
      if (c.state === 'suspended') {
        c.resume().then(() => { isUnlocked = true; }).catch(() => {});
      } else {
        isUnlocked = true;
      }
    }
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach((event) => {
    window.addEventListener(event, unlock, { once: true, passive: true });
  });

  /**
   * Bronze Manjira (finger cymbals) chime.
   * Shimmering metallic overtones with exponential decay.
   */
  function playManjira(volume = 0.45) {
    const c = getContext();
    if (!c) return;
    const now = c.currentTime;

    const master = c.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0.01, volume)), now);
    master.connect(c.destination);

    // Fundamental and metallic overtone frequencies for bronze/brass alloy
    const baseFreq = 3450;
    const overtones = [
      { freq: baseFreq, gain: 0.48, decay: 0.72 },
      { freq: baseFreq * 1.48, gain: 0.32, decay: 0.58 },
      { freq: baseFreq * 2.14, gain: 0.22, decay: 0.45 },
      { freq: baseFreq * 2.82, gain: 0.16, decay: 0.35 },
      { freq: baseFreq * 3.65, gain: 0.08, decay: 0.22 },
    ];

    overtones.forEach(({ freq, gain, decay }) => {
      const osc = c.createOscillator();
      const g = c.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() * 24 - 12), now);

      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(g);
      g.connect(master);

      osc.start(now);
      osc.stop(now + decay + 0.05);
    });

    // Metallic chime noise sparkle
    const bufferSize = Math.floor(c.sampleRate * 0.08);
    const noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.018));
    }

    const noise = c.createBufferSource();
    noise.buffer = noiseBuffer;

    const bpf = c.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(5200, now);
    bpf.Q.setValueAtTime(4.0, now);

    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.24, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(bpf);
    bpf.connect(noiseGain);
    noiseGain.connect(master);

    noise.start(now);
  }

  /**
   * Resonant Dhol (bass barrel drum) thump with high thapi snap.
   */
  function playDhol(volume = 0.55) {
    const c = getContext();
    if (!c) return;
    const now = c.currentTime;

    const master = c.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0.01, volume)), now);
    master.connect(c.destination);

    // 1. Bass Dagga membrane (deep thump with pitch envelope)
    const bassOsc = c.createOscillator();
    const bassGain = c.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(140, now);
    bassOsc.frequency.exponentialRampToValueAtTime(58, now + 0.12);

    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.85, now + 0.004);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    bassOsc.connect(bassGain);
    bassGain.connect(master);
    bassOsc.start(now);
    bassOsc.stop(now + 0.42);

    // 2. Mid resonance ring
    const midOsc = c.createOscillator();
    const midGain = c.createGain();
    midOsc.type = 'triangle';
    midOsc.frequency.setValueAtTime(210, now);
    midOsc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

    midGain.gain.setValueAtTime(0.42, now);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    midOsc.connect(midGain);
    midGain.connect(master);
    midOsc.start(now);
    midOsc.stop(now + 0.25);

    // 3. High Thapi rim snap
    const snapSize = Math.floor(c.sampleRate * 0.05);
    const snapBuffer = c.createBuffer(1, snapSize, c.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let i = 0; i < snapSize; i++) {
      snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.007));
    }

    const snap = c.createBufferSource();
    snap.buffer = snapBuffer;

    const snapFilter = c.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(1250, now);
    snapFilter.Q.setValueAtTime(2.2, now);

    const snapGain = c.createGain();
    snapGain.gain.setValueAtTime(0.32, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(master);
    snap.start(now);
  }

  /**
   * Garba Taali (hand clap) or Dandiya stick strike.
   */
  function playTaali(isDandiya = false, volume = 0.5) {
    const c = getContext();
    if (!c) return;
    const now = c.currentTime;

    const master = c.createGain();
    master.gain.setValueAtTime(Math.min(1, Math.max(0.01, volume)), now);
    master.connect(c.destination);

    if (isDandiya) {
      // Wood stick strike: tuned ping + crisp click
      const woodOsc = c.createOscillator();
      const woodGain = c.createGain();
      woodOsc.type = 'sine';
      woodOsc.frequency.setValueAtTime(1120 + Math.random() * 80, now);

      woodGain.gain.setValueAtTime(0.7, now);
      woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      woodOsc.connect(woodGain);
      woodGain.connect(master);
      woodOsc.start(now);
      woodOsc.stop(now + 0.09);

      // Wood harmonic
      const harmOsc = c.createOscillator();
      const harmGain = c.createGain();
      harmOsc.type = 'triangle';
      harmOsc.frequency.setValueAtTime(2180, now);
      harmGain.gain.setValueAtTime(0.28, now);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      harmOsc.connect(harmGain);
      harmGain.connect(master);
      harmOsc.start(now);
      harmOsc.stop(now + 0.06);
    } else {
      // Hand clap: multi-burst noise envelope
      const clapSize = Math.floor(c.sampleRate * 0.14);
      const clapBuffer = c.createBuffer(1, clapSize, c.sampleRate);
      const data = clapBuffer.getChannelData(0);
      const bursts = [0, 0.012, 0.025];

      for (let i = 0; i < clapSize; i++) {
        const t = i / c.sampleRate;
        let env = 0;
        for (const start of bursts) {
          if (t >= start) env += Math.exp(-(t - start) * 65);
        }
        data[i] = (Math.random() * 2 - 1) * Math.min(1, env) * 0.75;
      }

      const clap = c.createBufferSource();
      clap.buffer = clapBuffer;

      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(1.4, now);

      const clapGain = c.createGain();
      clapGain.gain.setValueAtTime(0.65, now);

      clap.connect(filter);
      filter.connect(clapGain);
      clapGain.connect(master);
      clap.start(now);
    }
  }

  window.GARBA_EARCONS = {
    unlock,
    playManjira,
    playDhol,
    playTaali,
  };
})();
