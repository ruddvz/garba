/**
 * PlayGarba Chowk - The Royal Gujarati Mandali & Aarti Visual Engine.
 * 
 * An original cultural creation for PlayGarba:
 * - Modhera Sun Temple inspired rotating golden brass mandala (Surya & Lotus Mandalam)
 *   that breathes and expands with the music rhythm.
 * - Authentic 3D-feeling Earthen Garbo with illuminated sacred geometry apertures,
 *   surrounded by radiating rangoli lotus petals and curling incense wisps (Dhoop).
 * - Sacred Akhand Jyot flame with organic audio-reactive flicker and warm ambient illumination.
 * - Floating Marigold Petals (Genda Phool) with realistic air-drift, 3D tumbling,
 *   and celebratory swirling vortices when clapping.
 * - Real-time Garba Taal & Step Guide: synchronizing Tran-Taali (3-clap), Be-Taali (2-clap),
 *   Hinch, and Dandiya Raas steps with music tempo.
 * - 360° progress ring with glowing ember beads, nonstop continuous set chapter diamonds,
 *   and Web Audio bronze Manjira chime.
 * - Cinematic integration over the 15 2K photographic courtyard backgrounds.
 */
(() => {
  const TAU = Math.PI * 2;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // Authentic Gujarati Garba Rhythms & Taal metadata
  const TAAL_MODES = {
    traditional: {
      name: 'Tran-Taali',
      nameGuj: '૩ તાળી ગરબા',
      meter: 4,
      steps: [
        { num: '૧', label: 'તાળી', action: 'Right Clap' },
        { num: '૨', label: 'તાળી', action: 'Left Clap' },
        { num: '૩', label: 'નમો', action: 'Dip & Clap' },
        { num: '૪', label: 'ફેર', action: 'Spin Turn' },
      ],
      bpm: 92,
      accent: '#d6b06f',
      glow: 'rgba(214, 176, 111, 0.4)',
      pot: '#782d15',
      flame: '#ffaa22',
      petalColors: ['#ff7b00', '#ffb703', '#e85d04', '#d00000', '#fff3b0'],
    },
    dandiya: {
      name: 'Dandiya Raas',
      nameGuj: 'દાંડિયા રાસ',
      meter: 4,
      steps: [
        { num: '૧', label: 'જમણે', action: 'Right Strike' },
        { num: '૨', label: 'ડાબે', action: 'Left Strike' },
        { num: '૩', label: 'ચક્કર', action: 'Partner Spin' },
        { num: '૪', label: 'સામસામે', action: 'Cross Strike' },
      ],
      bpm: 114,
      accent: '#b388ff',
      glow: 'rgba(179, 136, 255, 0.4)',
      pot: '#472175',
      flame: '#ffb944',
      petalColors: ['#ff007f', '#00f0ff', '#ffe600', '#ffffff', '#b388ff'],
    },
    devotional: {
      name: 'Aarti & Thaal',
      nameGuj: 'આરતી અને થાળ',
      meter: 4,
      steps: [
        { num: '૧', label: 'સમર્પણ', action: 'Devotion' },
        { num: '૨', label: 'તાળી', action: 'Aarti Clap' },
        { num: '૩', label: 'પ્રદક્ષિણા', action: 'Circumambulate' },
        { num: '૪', label: 'વંદન', action: 'Bowing' },
      ],
      bpm: 88,
      accent: '#ff8811',
      glow: 'rgba(255, 136, 17, 0.45)',
      pot: '#8a2b16',
      flame: '#ff7700',
      petalColors: ['#ff8811', '#ffaa00', '#e63946', '#ffd166', '#fff5ea'],
    },
    folk: {
      name: 'Be-Taali',
      nameGuj: '૨ તાળી લોકગીત',
      meter: 4,
      steps: [
        { num: '૧', label: 'આગળ', action: 'Step Forward' },
        { num: '૨', label: 'તાળી', action: 'High Clap' },
        { num: '૩', label: 'પાછળ', action: 'Step Back' },
        { num: '૪', label: 'ઝૂકો', action: 'Rhythmic Sway' },
      ],
      bpm: 98,
      accent: '#9a9fc7',
      glow: 'rgba(154, 159, 199, 0.4)',
      pot: '#6d341d',
      flame: '#ffa43b',
      petalColors: ['#ff9f1c', '#2ec4b6', '#e71d36', '#ffbf69', '#ffffff'],
    },
    sanedo: {
      name: 'Bhavai Hinch',
      nameGuj: 'સનેડો હીંચ',
      meter: 4,
      steps: [
        { num: '૧', label: 'હીંચ ૧', action: 'Fast Step 1' },
        { num: '૨', label: 'હીંચ ૨', action: 'Fast Step 2' },
        { num: '૩', label: 'તાળી', action: 'Double Clap' },
        { num: '૪', label: 'ઝડપ', action: 'Crescendo' },
      ],
      bpm: 136,
      accent: '#c93438',
      glow: 'rgba(201, 52, 56, 0.45)',
      pot: '#6b151a',
      flame: '#ff6622',
      petalColors: ['#e63946', '#ffb703', '#f4a261', '#ffffff', '#e76f51'],
    },
    fusion: {
      name: 'Arvachin Fusion',
      nameGuj: 'અર્વાચીન ફ્યુઝન',
      meter: 4,
      steps: [
        { num: '૧', label: 'બીટ ૧', action: 'Bass Drop' },
        { num: '૨', label: 'તાળી', action: 'Synth Clap' },
        { num: '૩', label: 'તરંગ', action: 'Laser Sweep' },
        { num: '૪', label: 'ઉછાળ', action: 'Climax' },
      ],
      bpm: 118,
      accent: '#38efdb',
      glow: 'rgba(56, 239, 219, 0.4)',
      pot: '#103c4f',
      flame: '#3df3d5',
      petalColors: ['#00f5d4', '#7b2cbf', '#ff007f', '#00b4d8', '#ffffff'],
    },
  };

  class GarbaChowk {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.options = options;

      this.mode = TAAL_MODES.traditional;
      this.progress = 0;
      this.isPlaying = false;
      this.chapters = [];
      this.isScrubbing = false;
      this.hoveredChapter = -1;

      this.width = 0;
      this.height = 0;
      this.cx = 0;
      this.cy = 0;
      this.radius = 0;
      this.dpr = 1;

      this.mandalaAngle = 0;
      this.lastFrame = performance.now();
      this.lastStepIdx = -1;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Floating Marigold Petals simulation
      this.petals = [];
      this.initPetals(48);

      // Incense smoke wisps (Dhoop)
      this.incenseWisps = [];

      // Lighting pulses & ripples
      this.ripples = [];

      this.init();
    }

    init() {
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
      this.bindEvents();
      this.render(performance.now());
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width || window.innerWidth;
      this.height = rect.height || window.innerHeight;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);

      this.ctx.resetTransform?.();
      this.ctx.scale(this.dpr, this.dpr);

      this.cx = this.width / 2;
      const isMobile = this.width < 700;
      // Position the Chowk center gracefully in the upper 40% of the screen
      this.cy = isMobile ? this.height * 0.36 : this.height * 0.38;
      this.radius = Math.min(this.width * (isMobile ? 0.44 : 0.33), this.height * (isMobile ? 0.28 : 0.32));
    }

    initPetals(count) {
      this.petals = [];
      const colors = this.mode.petalColors;
      for (let i = 0; i < count; i++) {
        this.petals.push({
          x: Math.random() * (this.width || 800),
          y: Math.random() * (this.height || 600),
          size: 7 + Math.random() * 9,
          angle: Math.random() * TAU,
          tumble: Math.random() * TAU,
          tumbleSpeed: 0.02 + Math.random() * 0.04,
          spinSpeed: (Math.random() - 0.5) * 0.03,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 0.35 + Math.random() * 0.65,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.65 + Math.random() * 0.35,
        });
      }
    }

    bindEvents() {
      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        };
      };

      const getAngle = (x, y) => {
        const dx = x - this.cx;
        const dy = y - this.cy;
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += TAU;
        return angle / TAU;
      };

      const isNearRing = (x, y) => {
        const dist = Math.hypot(x - this.cx, y - this.cy);
        return Math.abs(dist - this.radius) < 36;
      };

      this.canvas.addEventListener('mousedown', (e) => {
        const pos = getPos(e);
        if (isNearRing(pos.x, pos.y)) {
          this.isScrubbing = true;
          this.handleScrub(getAngle(pos.x, pos.y));
        } else {
          this.triggerFlowerToss(pos.x, pos.y);
        }
      });

      window.addEventListener('mousemove', (e) => {
        const pos = getPos(e);
        if (this.isScrubbing) {
          this.handleScrub(getAngle(pos.x, pos.y));
        } else {
          this.checkChapterHover(pos.x, pos.y);
        }
      });

      window.addEventListener('mouseup', () => {
        if (this.isScrubbing) {
          this.isScrubbing = false;
          window.GARBA_EARCONS?.playManjira(0.85);
        }
      });

      this.canvas.addEventListener('touchstart', (e) => {
        const pos = getPos(e);
        if (isNearRing(pos.x, pos.y)) {
          this.isScrubbing = true;
          this.handleScrub(getAngle(pos.x, pos.y));
        } else {
          this.triggerFlowerToss(pos.x, pos.y);
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (this.isScrubbing) {
          const pos = getPos(e);
          this.handleScrub(getAngle(pos.x, pos.y));
        }
      }, { passive: true });

      window.addEventListener('touchend', () => {
        if (this.isScrubbing) {
          this.isScrubbing = false;
          window.GARBA_EARCONS?.playManjira(0.85);
        }
      });
    }

    handleScrub(fraction) {
      this.progress = clamp(fraction, 0, 1);
      if (this.options?.onSeek) {
        this.options.onSeek({ phase: this.isScrubbing ? 'move' : 'start', fraction: this.progress });
      } else if (typeof window.GARBA_SEEK_STATE?.commitSeekFraction === 'function') {
        window.GARBA_SEEK_STATE.commitSeekFraction(this.progress);
      }
    }

    checkChapterHover(x, y) {
      if (!this.chapters || !this.chapters.length) {
        this.hoveredChapter = -1;
        return;
      }
      for (let i = 0; i < this.chapters.length; i++) {
        const chap = this.chapters[i];
        const angle = chap.fraction * TAU - Math.PI / 2;
        const cx = this.cx + Math.cos(angle) * this.radius;
        const cy = this.cy + Math.sin(angle) * this.radius;
        if (Math.hypot(x - cx, y - cy) < 14) {
          this.hoveredChapter = i;
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      this.hoveredChapter = -1;
      this.canvas.style.cursor = 'default';
    }

    setTheme(genreId) {
      const nextMode = TAAL_MODES[genreId] || TAAL_MODES.traditional;
      this.genreId = genreId;
      this.theme = { id: genreId };
      if (this.mode.name !== nextMode.name) {
        this.mode = nextMode;
        this.initPetals(48);
        this.updateTaalStepperUI();
        window.GARBA_EARCONS?.playDhol?.(0.5);
      }
    }

    setProgress(fraction) {
      if (!this.isScrubbing) {
        this.progress = clamp(fraction, 0, 1);
      }
    }

    setPlayback(playing) {
      this.isPlaying = Boolean(playing);
    }

    setPlaying(playing) {
      this.setPlayback(playing);
    }

    triggerTaali(x, y) {
      this.triggerFlowerToss(x, y);
    }

    joinCircle() {
      this.crowdCount = (this.crowdCount || 214) + 1;
      this.triggerFlowerToss();
    }

    setChapters(chapters, durationSeconds) {
      if (!chapters || !durationSeconds) {
        this.chapters = [];
        return;
      }
      this.chapters = chapters.map((c) => ({
        ...c,
        fraction: clamp((c.startSeconds || 0) / durationSeconds, 0, 1),
      }));
    }

    triggerFlowerToss(x = this.cx, y = this.cy) {
      // Release a celebratory burst of marigold petals in a swirling vortex
      const colors = this.mode.petalColors;
      for (let i = 0; i < 22; i++) {
        const ang = Math.random() * TAU;
        const spd = 3 + Math.random() * 6;
        this.petals.push({
          x,
          y,
          size: 8 + Math.random() * 8,
          angle: Math.random() * TAU,
          tumble: Math.random() * TAU,
          tumbleSpeed: 0.04 + Math.random() * 0.06,
          spinSpeed: (Math.random() - 0.5) * 0.06,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1.0,
        });
      }

      // Add radiant golden ring ripple
      this.ripples.push({
        x,
        y,
        radius: 10,
        maxRadius: Math.min(this.width, this.height) * 0.6,
        alpha: 0.9,
        color: this.mode.accent,
      });

      window.GARBA_EARCONS?.playTaali(0.75);
    }

    render(time) {
      requestAnimationFrame((t) => this.render(t));
      const dt = Math.min((time - this.lastFrame) / 1000, 0.1);
      this.lastFrame = time;

      const bpm = this.mode.bpm || 96;
      const speed = (bpm / 60) * (this.isPlaying ? 1 : 0.2);
      if (!this.reducedMotion) {
        this.mandalaAngle += dt * speed * 0.18;
      }

      // Calculate real-time Garba beat phase & Taal step
      const beatPhase = (time * (bpm / 60) * 0.001) % 1;
      const stepIdx = Math.floor(beatPhase * 4) % 4;
      if (this.lastStepIdx !== stepIdx) {
        this.lastStepIdx = stepIdx;
        this.syncStepIndicator(stepIdx);
      }

      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Modhera Sun Temple Inspired Rotating Brass Mandala
      this.drawModheraBrassMandala(time, beatPhase);

      // 2. Central Earthen Garbo Pot & Radiating Rangoli Petals
      this.drawCentralGarboPot(time, beatPhase);

      // 3. Incense smoke wisps (Dhoop)
      this.updateAndDrawIncense(dt);

      // 4. Sacred Akhand Jyot Flame
      this.drawAkhandJyotFlame(time, beatPhase);

      // 5. Floating Marigold Petals (Genda Phool)
      this.updateAndDrawPetals(dt);

      // 6. Interactive Light Ripples
      this.drawRipples();

      // 7. 360° Radial Progress Track & Nonstop Chapter Beads
      this.drawProgressAndChapters();
    }

    /**
     * Draw the Modhera Sun Temple inspired golden brass mandala (Kansa Thali):
     * Concentric filigree rings with 12 carved lotus petals and 24 radiant sun rays.
     */
    drawModheraBrassMandala(time, beatPhase) {
      const r = this.radius;
      const pulse = 1 + (this.isPlaying ? Math.sin(beatPhase * TAU) * 0.025 : 0);

      this.ctx.save();
      this.ctx.translate(this.cx, this.cy);
      this.ctx.scale(pulse, pulse);

      // Outer ambient warm glow
      const glow = this.ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.25);
      glow.addColorStop(0, this.mode.glow);
      glow.addColorStop(0.6, `${this.mode.accent}0a`);
      glow.addColorStop(1, 'transparent');
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 1.25, 0, TAU);
      this.ctx.fill();

      // 1. Outermost Brass Beaded Rim
      this.ctx.strokeStyle = this.mode.accent;
      this.ctx.lineWidth = 1.4;
      this.ctx.globalAlpha = 0.55;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r, 0, TAU);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.94, 0, TAU);
      this.ctx.lineWidth = 0.8;
      this.ctx.stroke();

      // Beaded rim pearls
      const pearlCount = 48;
      for (let i = 0; i < pearlCount; i++) {
        const a = (i / pearlCount) * TAU + this.mandalaAngle * 0.5;
        this.ctx.beginPath();
        this.ctx.arc(Math.cos(a) * (r * 0.97), Math.sin(a) * (r * 0.97), 1.6, 0, TAU);
        this.ctx.fillStyle = this.mode.accent;
        this.ctx.fill();
      }

      // 2. Middle Ring: 24 Radiant Sun Rays (Surya Mandalam)
      const rayCount = 24;
      this.ctx.save();
      this.ctx.rotate(-this.mandalaAngle);
      for (let i = 0; i < rayCount; i++) {
        const a = (i / rayCount) * TAU;
        const innerR = r * 0.65;
        const outerR = r * 0.88;
        const tipX = Math.cos(a) * outerR;
        const tipY = Math.sin(a) * outerR;

        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(a - 0.06) * innerR, Math.sin(a - 0.06) * innerR);
        this.ctx.lineTo(tipX, tipY);
        this.ctx.lineTo(Math.cos(a + 0.06) * innerR, Math.sin(a + 0.06) * innerR);
        this.ctx.closePath();

        this.ctx.fillStyle = i % 2 === 0 ? `${this.mode.accent}24` : `${this.mode.accent}12`;
        this.ctx.fill();
        this.ctx.strokeStyle = `${this.mode.accent}66`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
      this.ctx.restore();

      // 3. Inner Ring: 12 Carved Sacred Lotus Petals
      const petalCount = 12;
      this.ctx.save();
      this.ctx.rotate(this.mandalaAngle * 1.2);
      for (let i = 0; i < petalCount; i++) {
        const a = (i / petalCount) * TAU;
        const petR = r * 0.58;
        this.ctx.save();
        this.ctx.translate(Math.cos(a) * (r * 0.36), Math.sin(a) * (r * 0.36));
        this.ctx.rotate(a + Math.PI / 2);

        this.ctx.beginPath();
        this.ctx.moveTo(0, -petR * 0.45);
        this.ctx.quadraticCurveTo(petR * 0.24, -petR * 0.15, 0, petR * 0.15);
        this.ctx.quadraticCurveTo(-petR * 0.24, -petR * 0.15, 0, -petR * 0.45);
        this.ctx.closePath();

        this.ctx.fillStyle = `${this.mode.accent}30`;
        this.ctx.fill();
        this.ctx.strokeStyle = `${this.mode.accent}88`;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        this.ctx.restore();
      }
      this.ctx.restore();

      this.ctx.restore();
    }

    /**
     * Central Earthen Garbo pot with classical contours & radiating rangoli
     */
    drawCentralGarboPot(time, beatPhase) {
      const s = this.radius * 0.18;
      const beatPulse = Math.sin(beatPhase * TAU) * 0.5 + 0.5;

      this.ctx.save();
      this.ctx.translate(this.cx, this.cy);

      // Radiating Rangoli Lotus Dots
      const dotRings = 2;
      for (let ring = 0; ring < dotRings; ring++) {
        const rr = s * (1.15 + ring * 0.35);
        const count = 16 + ring * 8;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU + ring * 0.2;
          this.ctx.beginPath();
          this.ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.8, 0, TAU);
          this.ctx.fillStyle = `${this.mode.accent}66`;
          this.ctx.fill();
        }
      }

      // Sculpted Terracotta Garbo Pot Body
      this.ctx.lineWidth = Math.max(1, s * 0.03);
      this.ctx.strokeStyle = this.mode.accent;
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(-s * 0.34, -s * 0.52);
      this.ctx.bezierCurveTo(-s * 0.84, -s * 0.34, -s * 0.84, s * 0.46, 0, s * 0.60);
      this.ctx.bezierCurveTo(s * 0.84, s * 0.46, s * 0.84, -s * 0.34, s * 0.34, -s * 0.52);
      this.ctx.closePath();

      // Deep clay gradient with volumetric shading
      const potGrad = this.ctx.createLinearGradient(-s * 0.6, -s * 0.5, s * 0.6, s * 0.6);
      potGrad.addColorStop(0, this.mode.pot);
      potGrad.addColorStop(0.5, '#4a1508');
      potGrad.addColorStop(1, '#200703');
      this.ctx.fillStyle = potGrad;
      this.ctx.fill();
      this.ctx.stroke();

      // Carved Sacred Geometry Apertures (Star perforations)
      for (let ring = 0; ring < 2; ring++) {
        const rr = s * (0.26 + ring * 0.28);
        const count = 8 + ring * 6;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU + ring * 0.26;
          const hx = Math.cos(a) * rr;
          const hy = Math.sin(a) * rr * 0.86 + s * 0.06;

          this.ctx.beginPath();
          this.ctx.arc(hx, hy, s * 0.055, 0, TAU);
          this.ctx.fillStyle = '#fffae5';
          this.ctx.globalAlpha = 0.6 + (this.isPlaying ? beatPulse * 0.4 : 0.2);
          this.ctx.fill();
          this.ctx.globalAlpha = 1;
        }
      }

      // Brass Rim and Neck
      this.ctx.beginPath();
      this.ctx.ellipse(0, -s * 0.52, s * 0.36, s * 0.12, 0, 0, TAU);
      this.ctx.fillStyle = this.mode.accent;
      this.ctx.fill();
      this.ctx.strokeStyle = '#fff2b8';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.restore();
    }

    /**
     * Draw the sacred Akhand Jyot flame leaning and flickering to the beat
     */
    drawAkhandJyotFlame(time, beatPhase) {
      const s = this.radius * 0.18;
      const beatPulse = Math.sin(beatPhase * TAU) * 0.5 + 0.5;
      const flick = 0.92 + (this.isPlaying ? beatPulse * 0.22 : 0.08);
      const lean = Math.sin(time * 0.0035) * 0.14 * flick;

      this.ctx.save();
      this.ctx.translate(this.cx, this.cy - s * 0.56);
      this.ctx.rotate(lean);

      // Ambient golden fire aura
      const aura = this.ctx.createRadialGradient(0, -s * 0.35, 2, 0, -s * 0.35, s * 1.5 * flick);
      aura.addColorStop(0, 'rgba(255, 200, 50, 0.45)');
      aura.addColorStop(0.5, 'rgba(255, 120, 20, 0.15)');
      aura.addColorStop(1, 'transparent');
      this.ctx.fillStyle = aura;
      this.ctx.beginPath();
      this.ctx.arc(0, -s * 0.35, s * 1.5 * flick, 0, TAU);
      this.ctx.fill();

      // Outer Golden Flame Leaf
      this.ctx.beginPath();
      this.ctx.moveTo(0, -s * 0.72 * flick);
      this.ctx.bezierCurveTo(s * 0.28, -s * 0.35, s * 0.18, 0, 0, 0);
      this.ctx.bezierCurveTo(-s * 0.18, 0, -s * 0.28, -s * 0.35, 0, -s * 0.72 * flick);
      this.ctx.closePath();

      const flameGrad = this.ctx.createLinearGradient(0, -s * 0.72 * flick, 0, 0);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.35, this.mode.flame);
      flameGrad.addColorStop(1, '#ff3b00');
      this.ctx.fillStyle = flameGrad;
      this.ctx.fill();

      // Inner White-Hot Flame Core
      this.ctx.beginPath();
      this.ctx.moveTo(0, -s * 0.42 * flick);
      this.ctx.bezierCurveTo(s * 0.12, -s * 0.2, s * 0.08, 0, 0, 0);
      this.ctx.bezierCurveTo(-s * 0.08, 0, -s * 0.12, -s * 0.2, 0, -s * 0.42 * flick);
      this.ctx.closePath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();

      this.ctx.restore();
    }

    /**
     * Incense smoke wisps (Dhoop) rising gently from the Garbo
     */
    updateAndDrawIncense(dt) {
      if (Math.random() < 0.25) {
        this.incenseWisps.push({
          x: this.cx + (Math.random() - 0.5) * 14,
          y: this.cy - this.radius * 0.18,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.7 - Math.random() * 0.6,
          radius: 3 + Math.random() * 4,
          alpha: 0.35,
        });
      }

      this.ctx.save();
      for (let i = this.incenseWisps.length - 1; i >= 0; i--) {
        const w = this.incenseWisps[i];
        w.x += w.vx + Math.sin(w.y * 0.05) * 0.25;
        w.y += w.vy;
        w.radius += dt * 8;
        w.alpha -= dt * 0.12;

        if (w.alpha <= 0) {
          this.incenseWisps.splice(i, 1);
          continue;
        }

        this.ctx.beginPath();
        this.ctx.arc(w.x, w.y, w.radius, 0, TAU);
        this.ctx.fillStyle = `rgba(246, 236, 215, ${w.alpha * 0.25})`;
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    /**
     * Floating Marigold Petals simulation (Genda Phool)
     */
    updateAndDrawPetals(dt) {
      this.ctx.save();
      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];

        p.x += p.vx;
        p.y += p.vy;
        p.tumble += p.tumbleSpeed;
        p.angle += p.spinSpeed;

        // Natural air resistance
        p.vx *= 0.99;

        // Wrap around screen
        if (p.y > this.height + 20) {
          p.y = -20;
          p.x = Math.random() * this.width;
        }
        if (p.x < -20) p.x = this.width + 20;
        if (p.x > this.width + 20) p.x = -20;

        // Draw 3D-tumbling petal
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.angle);
        const scaleX = Math.cos(p.tumble);
        this.ctx.scale(scaleX, 1);

        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, TAU);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fill();

        // Subtle petal center crease
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size * 0.7);
        this.ctx.lineTo(0, p.size * 0.7);
        this.ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        this.ctx.lineWidth = 0.8;
        this.ctx.stroke();

        this.ctx.restore();
      }
      this.ctx.restore();
    }

    drawRipples() {
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += 5;
        r.alpha -= 0.022;

        if (r.alpha <= 0) {
          this.ripples.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius, 0, TAU);
        this.ctx.strokeStyle = r.color;
        this.ctx.globalAlpha = r.alpha;
        this.ctx.lineWidth = 1.6;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    drawProgressAndChapters() {
      const r = this.radius;

      // 1. Radial Progress Ring
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(this.cx, this.cy, r, 0, TAU);
      this.ctx.strokeStyle = `${this.mode.accent}24`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      if (this.progress > 0) {
        const start = -Math.PI / 2;
        const end = start + this.progress * TAU;

        this.ctx.beginPath();
        this.ctx.arc(this.cx, this.cy, r, start, end);
        this.ctx.strokeStyle = this.mode.accent;
        this.ctx.lineWidth = 2.8;
        this.ctx.stroke();

        // Progress head bead
        const hx = this.cx + Math.cos(end) * r;
        const hy = this.cy + Math.sin(end) * r;
        this.ctx.beginPath();
        this.ctx.arc(hx, hy, 4.5, 0, TAU);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.strokeStyle = this.mode.accent;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // 2. Nonstop Set Chapter Diamond Beads (◆)
      if (this.chapters && this.chapters.length) {
        this.chapters.forEach((chap, idx) => {
          const angle = chap.fraction * TAU - Math.PI / 2;
          const x = this.cx + Math.cos(angle) * r;
          const y = this.cy + Math.sin(angle) * r;
          const isHovered = this.hoveredChapter === idx;
          const isPassed = chap.fraction <= this.progress;

          this.ctx.save();
          this.ctx.translate(x, y);
          this.ctx.rotate(angle);

          const s = isHovered ? 6 : 4;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -s);
          this.ctx.lineTo(s, 0);
          this.ctx.lineTo(0, s);
          this.ctx.lineTo(-s, 0);
          this.ctx.closePath();

          this.ctx.fillStyle = isHovered ? '#ffffff' : (isPassed ? this.mode.accent : `${this.mode.accent}99`);
          this.ctx.fill();
          this.ctx.strokeStyle = '#111323';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();

          this.ctx.restore();
        });
      }

      this.ctx.restore();
    }

    /**
     * Synchronize DOM Taal Stepper with active step
     */
    syncStepIndicator(stepIdx) {
      const steps = document.querySelectorAll('.taal-step');
      if (steps && steps.length) {
        steps.forEach((st, idx) => {
          if (idx === stepIdx && this.isPlaying) {
            st.classList.add('is-active');
          } else {
            st.classList.remove('is-active');
          }
        });
      }
    }

    updateTaalStepperUI() {
      const nameEl = document.getElementById('taalName');
      if (nameEl) nameEl.textContent = this.mode.nameGuj;

      const steps = document.querySelectorAll('.taal-step');
      if (steps && steps.length >= 4) {
        this.mode.steps.forEach((s, i) => {
          if (steps[i]) {
            const num = steps[i].querySelector('.step-num');
            const lbl = steps[i].querySelector('.step-label');
            if (num) num.textContent = s.num;
            if (lbl) lbl.textContent = s.label;
          }
        });
      }
    }
  }

  window.GarbaChowk = GarbaChowk;

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('garbaChowk');
    if (!canvas) return;

    const chowk = window.garbaChowk || new GarbaChowk(canvas);
    window.GARBA_CHOWK = chowk;
    window.garbaChowk = chowk;

    // Connect with genre switches
    const observer = new MutationObserver(() => {
      const genre = document.getElementById('app')?.dataset.genre;
      if (genre) chowk.setTheme(genre);
    });
    observer.observe(document.getElementById('app') || document.body, {
      attributes: true,
      attributeFilter: ['data-genre'],
    });

    // Connect with playback state
    window.addEventListener('playgarba:play', () => chowk.setPlayback(true));
    window.addEventListener('playgarba:pause', () => chowk.setPlayback(false));

    // Connect with timeline seek
    const progressEl = document.getElementById('progress');
    if (progressEl) {
      const updateProg = () => {
        const max = Number(progressEl.max) || 1000;
        const val = Number(progressEl.value) || 0;
        chowk.setProgress(val / max);
      };
      progressEl.addEventListener('input', updateProg);
      setInterval(updateProg, 250);
    }

    // Interactive Taali button
    const taaliBtn = document.getElementById('taaliButton');
    if (taaliBtn) {
      taaliBtn.addEventListener('click', () => {
        chowk.triggerFlowerToss();
      });
    }

    // Interactive Flower Shower button
    const flowerBtn = document.getElementById('flowerButton');
    if (flowerBtn) {
      flowerBtn.addEventListener('click', () => {
        chowk.triggerFlowerToss();
      });
    }

    // Homeland clock
    const clockEl = document.getElementById('homelandClock');
    if (clockEl) {
      const updateClock = () => {
        try {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          clockEl.textContent = `${timeStr} AMD`;
        } catch {
          clockEl.textContent = 'AMD (IST)';
        }
      };
      updateClock();
      setInterval(updateClock, 30000);
    }
  });
})();
