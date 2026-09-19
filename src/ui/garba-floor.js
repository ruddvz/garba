// PlayGarba Living Dance Floor (Garba Mandala Engine)
// High-DPI Canvas engine rendering concentric rings of Gujarati folk dancers,
// sacred Diya flame, radial playback progress, interactive Dandiya tap sparks,
// and real-time Garba rhythm (BPM) detection.

export class GarbaFloor {
  constructor(canvas) {
    this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.angle = 0;
    this.innerAngle = 0;
    this.targetSpeed = 0.0035;
    this.currentSpeed = 0;
    this.isPlaying = false;
    this.progress = 0; // 0 to 1
    this.pulse = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rafId = null;
    this.lastTime = 0;

    // Interactive Sparks & Tap Tempo
    this.sparks = [];
    this.tapHistory = [];
    this.tempoBadge = null; // { bpm, label, alpha }
    this.cx = 0;
    this.cy = 0;
    this.maxRadius = 0;

    this.dancerColors = [
      '#e53935', // Kumkum Red
      '#f59e0b', // Marigold Yellow
      '#0284c7', // Peacock Blue
      '#10b981', // Emerald Green
      '#d97706', // Ochre / Kesar
      '#ec4899', // Gulabi Pink
    ];

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize, { passive: true });
    this.handleResize();
    this.start();
  }

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cx = this.width / 2;
    this.cy = this.height > 640 ? this.height * 0.44 : this.height * 0.40;
    this.maxRadius = Math.min(this.width * 0.46, this.height * 0.38, 380);
  }

  setPlaying(playing) {
    this.isPlaying = playing;
  }

  setProgress(ratio) {
    this.progress = Math.max(0, Math.min(1, ratio || 0));
  }

  triggerPulse() {
    this.pulse = 1.0;
  }

  handleTap(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.cx;
    const y = clientY - rect.top - this.cy;

    this.triggerPulse();
    this.spawnSparks(x, y);
    this.calculateTapTempo();
  }

  spawnSparks(originX, originY) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 90;
      this.sparks.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: this.dancerColors[Math.floor(Math.random() * this.dancerColors.length)],
        size: 2.5 + Math.random() * 2.5,
        alpha: 1.0,
        decay: 1.2 + Math.random() * 0.8,
      });
    }
  }

  calculateTapTempo() {
    const now = performance.now();
    this.tapHistory.push(now);
    // Keep last 6 taps within 2.5 seconds
    this.tapHistory = this.tapHistory.filter((t) => now - t < 2500);

    if (this.tapHistory.length >= 3) {
      const intervals = [];
      for (let i = 1; i < this.tapHistory.length; i++) {
        intervals.push(this.tapHistory[i] - this.tapHistory[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 200 && avgInterval < 1200) {
        const bpm = Math.round(60000 / avgInterval);
        let label = 'બે તાળી · 2-Taali';
        if (bpm < 95) label = 'ધીમો રાસ · Pratham Stuti';
        else if (bpm >= 95 && bpm < 118) label = 'બે તાળી · 2-Taali';
        else if (bpm >= 118 && bpm < 138) label = 'ત્રણ તાળી · Tran-Taali';
        else label = 'હીંચ · High Speed Hinch';

        this.tempoBadge = {
          bpm,
          label,
          alpha: 1.0,
        };
      }
    }
  }

  start() {
    if (this.rafId) return;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.animate);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  animate(now) {
    this.rafId = requestAnimationFrame(this.animate);
    if (document.hidden) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Smooth speed interpolation
    const destSpeed = this.isPlaying ? this.targetSpeed : 0.0003;
    this.currentSpeed += (destSpeed - this.currentSpeed) * 0.06;

    if (!this.reducedMotion) {
      this.angle += this.currentSpeed;
      this.innerAngle -= this.currentSpeed * 0.85; // Counter-rotation in inner ring
    }

    if (this.pulse > 0) {
      this.pulse = Math.max(0, this.pulse - dt * 1.5);
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.alpha -= s.decay * dt;
      if (s.alpha <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Update tempo badge fade
    if (this.tempoBadge && this.tempoBadge.alpha > 0) {
      this.tempoBadge.alpha = Math.max(0, this.tempoBadge.alpha - dt * 0.35);
    }

    this.draw(now);
  }

  draw(now) {
    const { ctx, width, height, cx, cy, maxRadius } = this;
    if (!ctx || maxRadius < 50) return;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Subtle Background Aura / Floor Scrim
    const floorGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, maxRadius * 1.08);
    floorGrad.addColorStop(0, 'rgba(230, 162, 60, 0.14)');
    floorGrad.addColorStop(0.5, 'rgba(17, 22, 36, 0.45)');
    floorGrad.addColorStop(0.9, 'rgba(17, 19, 35, 0.75)');
    floorGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = floorGrad;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius * 1.08, 0, Math.PI * 2);
    ctx.fill();

    // 2. Pulse Wave from Dandiya Tap
    if (this.pulse > 0.01) {
      ctx.save();
      const pRadius = maxRadius * (1 - this.pulse) * 1.1;
      ctx.strokeStyle = `rgba(245, 158, 11, ${this.pulse * 0.45})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, pRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Outer Decorative Rangoli Ring & Progress Arc
    this.drawOuterRing(ctx, maxRadius, now);

    // 4. Outer Dancers Ring (24 dancers, including User Avatar Spot)
    this.drawDancersRing(ctx, maxRadius * 0.72, 24, this.angle, 1.0, true);

    // 5. Inner Dancers Ring (16 dancers)
    this.drawDancersRing(ctx, maxRadius * 0.46, 16, this.innerAngle, 0.82, false);

    // 6. Sacred Diya & Garbi Centerpiece
    this.drawDiya(ctx, maxRadius * 0.22, now);

    // 7. Interactive Dandiya Sparks
    this.drawSparks(ctx);

    // 8. Live Rhythm (BPM) Badge
    this.drawTempoBadge(ctx);

    ctx.restore();
  }

  drawOuterRing(ctx, radius, now) {
    ctx.save();
    ctx.strokeStyle = 'rgba(246, 236, 215, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(246, 236, 215, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 10, 0, Math.PI * 2);
    ctx.stroke();

    const teeth = 48;
    ctx.fillStyle = 'rgba(246, 236, 215, 0.32)';
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const x = Math.cos(a) * (radius - 5);
      const y = Math.sin(a) * (radius - 5);
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dynamic Radial Progress Arc
    if (this.progress > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + this.progress * Math.PI * 2;

      ctx.save();
      ctx.strokeStyle = '#f59e0b'; // Radiant Saffron Gold
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.65)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.stroke();

      const hx = Math.cos(endAngle) * radius;
      const hy = Math.sin(endAngle) * radius;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawDancersRing(ctx, radius, count, rotationAngle, scale, hasUserSpot) {
    ctx.save();
    ctx.rotate(rotationAngle);

    ctx.strokeStyle = 'rgba(246, 236, 215, 0.07)';
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const isUser = hasUserSpot && i === 0;
      const color = isUser ? '#f59e0b' : this.dancerColors[i % this.dancerColors.length];

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.scale(scale, scale);

      // User Spot Golden Aura & Badge
      if (isUser) {
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -6, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.beginPath();
        ctx.arc(0, -6, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      this.drawDancerFigure(ctx, color, i % 2 === 0);
      ctx.restore();
    }

    ctx.restore();
  }

  drawDancerFigure(ctx, color, isDandiya) {
    ctx.save();

    // 1. Head & Paghdi / Dupatta
    ctx.fillStyle = '#fce7c8';
    ctx.beginPath();
    ctx.arc(0, -18, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Turban / Paghdi
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -20.5, 3.5, Math.PI, Math.PI * 2);
    ctx.fill();

    // 2. Torso (Angarakha / Kediyu)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-3, -14);
    ctx.lineTo(3, -14);
    ctx.lineTo(2, -6);
    ctx.lineTo(-2, -6);
    ctx.closePath();
    ctx.fill();

    // 3. Flared Skirt (Chaniya / Ghaghra)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(2, -6);
    ctx.quadraticCurveTo(8, 2, 7, 7);
    ctx.lineTo(-7, 7);
    ctx.quadraticCurveTo(-8, 2, -2, -6);
    ctx.closePath();
    ctx.fill();

    // Skirt decorative hem
    ctx.strokeStyle = '#fff8e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 6);
    ctx.lineTo(6, 6);
    ctx.stroke();

    // 4. Arms & Dandiya Sticks / Clapping
    ctx.strokeStyle = '#fce7c8';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    if (isDandiya) {
      ctx.beginPath();
      ctx.moveTo(-2, -12);
      ctx.lineTo(-7, -15);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(2, -12);
      ctx.lineTo(7, -15);
      ctx.stroke();

      // Dandiya sticks
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-9, -12);
      ctx.lineTo(-4, -22);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(9, -12);
      ctx.lineTo(4, -22);
      ctx.stroke();
    } else {
      // Clapping
      ctx.beginPath();
      ctx.moveTo(-2, -12);
      ctx.lineTo(0, -16);
      ctx.moveTo(2, -12);
      ctx.lineTo(0, -16);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawDiya(ctx, radius, now) {
    ctx.save();

    // Radiating Diya Lotus Petals
    const petals = 12;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const px = Math.cos(a) * (radius * 1.05);
      const py = Math.sin(a) * (radius * 1.05);
      ctx.beginPath();
      ctx.ellipse(px, py, 6, 2.5, a, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sacred Terracotta Clay Base
    const baseGrad = ctx.createRadialGradient(0, 4, 2, 0, 4, radius * 0.7);
    baseGrad.addColorStop(0, '#8c2d19');
    baseGrad.addColorStop(0.7, '#5a1a0d');
    baseGrad.addColorStop(1, '#330e07');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, radius * 0.55, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diya Rim Golden Edge
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 4, radius * 0.55, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Reservoir
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(0, 4, radius * 0.38, radius * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warm Ambient Light Glow
    const flicker = Math.sin(now * 0.008) * 2;
    const flameGlow = ctx.createRadialGradient(0, -6, 2, 0, -6, radius * 1.3 + flicker);
    flameGlow.addColorStop(0, 'rgba(255, 236, 179, 0.85)');
    flameGlow.addColorStop(0.3, 'rgba(255, 152, 0, 0.45)');
    flameGlow.addColorStop(0.7, 'rgba(230, 81, 0, 0.15)');
    flameGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = flameGlow;
    ctx.beginPath();
    ctx.arc(0, -6, radius * 1.3 + flicker, 0, Math.PI * 2);
    ctx.fill();

    // Sacred Flame (Jyoti) Teardrop
    const sway = Math.sin(now * 0.012) * 1.5;
    ctx.save();
    ctx.translate(sway, 0);

    ctx.fillStyle = '#ff7043';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.bezierCurveTo(-6, -4, -6, -16, 0, -26);
    ctx.bezierCurveTo(6, -16, 6, -4, 0, 2);
    ctx.fill();

    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.bezierCurveTo(-3, -3, -3, -11, 0, -18);
    ctx.bezierCurveTo(3, -11, 3, -3, 0, 1);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  drawSparks(ctx) {
    for (const s of this.sparks) {
      ctx.save();
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawTempoBadge(ctx) {
    if (!this.tempoBadge || this.tempoBadge.alpha <= 0.01) return;
    const { bpm, label, alpha } = this.tempoBadge;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, this.maxRadius * 0.28);

    // Pill background
    const text = `🥁 ${bpm} BPM · ${label}`;
    ctx.font = '600 13px Inter, -apple-system, sans-serif';
    const metrics = ctx.measureText(text);
    const pillWidth = metrics.width + 24;
    const pillHeight = 26;

    ctx.fillStyle = 'rgba(13, 17, 30, 0.88)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, 999);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fce7c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);

    ctx.restore();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }
}
