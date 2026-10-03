// The filming drone over the venue, and what it films.
//
// The drone: a cinema quadcopter about a metre across. A shell and battery, four carbon arms to motors with spinning
// rotors (each a blurred disc with a faint blade), landing legs, and a gimbal under the nose whose camera points at
// what's being filmed, a red dot lit while it records. Its lights: red on the left arm and green on the right (as an
// aircraft's), a steady white at the nose, a red beacon on top that double-blinks, and a white strobe underneath.
// It flies where the 2D scene says (dronePos) and faces what it films (the shot's target).
//
// What it films: the stage screen's aerial picture. The 2D scene draws that shot's people over it, with the same
// camera (shot centre, turn, span and tilt), so here the venue itself is drawn from above into a small picture that
// goes on the screen, under them.

import * as THREE from 'three';
import { TAU } from './util.js';
import { std } from './kit.js';

export function buildDrone(parent) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); parent.add(g);
  const shell = std('#2e2b33', 0.4, 0.3), carbon = std('#141417', 0.45, 0.5), metal = std('#9a9ea6', 0.3, 0.8);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); body.add(m); return m; };
  // Shell, battery on top, the arms out in an X to the motors
  const hull = add(new THREE.SphereGeometry(0.2, 16, 10), shell, 0, 0, 0); hull.scale.set(1, 0.42, 1.45);
  add(new THREE.BoxGeometry(0.18, 0.07, 0.3), std('#1d1b22', 0.5, 0.2), 0, 0.085, -0.03);
  const motors = [], rotors = [];
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
    const ax = sx * 0.38, az = sz * 0.36, len = Math.hypot(ax, az);
    add(new THREE.BoxGeometry(0.035, 0.03, len), carbon, ax / 2, 0.01, az / 2, 0, Math.atan2(ax, az));
    motors.push(add(new THREE.CylinderGeometry(0.04, 0.045, 0.06, 12), metal, ax, 0.04, az));
    const disc = add(new THREE.CircleGeometry(0.2, 24), new THREE.MeshBasicMaterial({ color: '#d8dce6', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }), ax, 0.075, az, -Math.PI / 2);
    const blade = add(new THREE.BoxGeometry(0.4, 0.004, 0.025), std('#1a1a1e', 0.5), ax, 0.078, az);
    rotors.push({ blade, dir: i % 3 === 0 ? 1 : -1 }); disc.renderOrder = 4;
  });
  // Landing legs
  [-1, 1].forEach((sx) => { add(new THREE.BoxGeometry(0.02, 0.2, 0.02), carbon, sx * 0.12, -0.14, 0.05, 0, 0, sx * 0.25); add(new THREE.BoxGeometry(0.02, 0.02, 0.34), carbon, sx * 0.15, -0.24, 0.02); });
  // The gimbal and its camera, which turns down at what it films
  const gimbal = new THREE.Group(); gimbal.position.set(0, -0.1, 0.2); body.add(gimbal);
  gimbal.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), std('#222127', 0.4, 0.4)));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.06, 14), std('#0c0c10', 0.15, 0.6)); lens.rotation.x = Math.PI / 2; lens.position.z = 0.07; gimbal.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#5a7cc0').multiplyScalar(1.4) })); glass.position.z = 0.101; gimbal.add(glass);
  // Lights
  const light = (hex, r, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); m.position.set(x, y, z); m.userData.hex = new THREE.Color(hex); body.add(m); return m; };
  const port = light('#ff4a3a', 0.03, -0.38, 0.0, 0.36), starboard = light('#5dff8a', 0.03, 0.38, 0.0, 0.36), nose = light('#ffffff', 0.022, 0, 0.0, 0.3);
  const beacon = light('#ff2a1e', 0.03, 0, 0.13, -0.05), strobe = light('#ffffff', 0.035, 0, -0.1, -0.1), rec = light('#ff2020', 0.008, 0.035, 0.03, 0.05);
  gimbal.add(rec);
  const setLight = (m, k) => { m.material.color.copy(m.userData.hex).multiplyScalar(k); m.visible = k > 0.01; };
  // The orb a venue of another world flies instead (style 'orb'): a ball of smoked glass with a lit core, a ring of light
  // turning round its waist, the camera's eye a cold point on its front
  const orb = new THREE.Group(); orb.visible = false; g.add(orb);
  const shellM = new THREE.MeshStandardMaterial({ color: '#1a1424', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.55, depthWrite: false });
  orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), shellM));
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); orb.add(core);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); halo.rotation.x = Math.PI / 2; orb.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); orb.add(halo2);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false })); eye.position.z = 0.262; orb.add(eye);
  let style = 'quad';
  g.visible = false;
  return {
    group: g,
    // 'quad' (the camera drone) or 'orb'
    setStyle(k) { style = k === 'orb' ? 'orb' : 'quad'; body.visible = style === 'quad'; orb.visible = style === 'orb'; },
    // s: { x, y, z, tx, tz } in the venue's coordinates; t: time
    update(s, t, reduce) {
      if (!s) { g.visible = false; return; }
      g.visible = true; g.position.set(s.x, s.y + (style === 'orb' && !reduce ? 0.18 * Math.sin(t * 1.1) : 0), s.z);
      const dx = s.tx - s.x, dz = s.tz - s.z, dist = Math.hypot(dx, dz) || 1;
      g.rotation.y = Math.atan2(dx, dz);
      if (style === 'orb') {
        // the core breathes ember and violet, the rings turn against each other, the eye looks down at what it films
        const k = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2);
        core.material.color.setRGB(1.6 + 0.6 * k, 0.75 + 0.2 * k, 1.1 + 0.9 * (1 - k));
        halo.material.color.setRGB(1.1, 0.9, 2.2); halo2.material.color.setRGB(2.0, 1.1, 0.5);
        halo.rotation.z = reduce ? 0 : t * 1.4; halo2.rotation.y = reduce ? 0.6 : -t * 1.1; halo2.rotation.x = 0.5;
        orb.rotation.x = Math.atan2(s.y, dist) * 0.6; eye.material.color.setRGB(1.4, 2.2, 2.6);
        return;
      }
      // Nose a little down as it holds position against the air, and a slow wobble
      body.rotation.x = 0.08 + (reduce ? 0 : 0.03 * Math.sin(t * 1.3));
      body.rotation.z = reduce ? 0 : 0.04 * Math.sin(t * 0.9 + 1);
      gimbal.rotation.x = Math.atan2(s.y, dist) - body.rotation.x;
      rotors.forEach((r, i) => { r.blade.rotation.y = reduce ? i : t * 90 * r.dir; });
      const ph = t % 1, blink = reduce ? 1 : (ph < 0.08 || (ph > 0.18 && ph < 0.26)) ? 1 : 0, flash = reduce ? 0 : (t % 1.6) < 0.05 ? 1 : 0;
      setLight(port, 3); setLight(starboard, 3); setLight(nose, 2.2); setLight(beacon, 3 * blink); setLight(strobe, 2.6 * flash); // (bright enough to blink in the night, never a white disc when it passes near the camera)
      setLight(rec, 3 * (Math.floor(t * 1.5) % 2 === 0 || reduce ? 1 : 0.3));
    }
  };
}

// A close shot's camera: at eye height a few metres from its subject, looking past them (eye and at in the venue's
// coordinates; world space mirrors Z)
export function aimClose(cam, a) {
  cam.fov = a.fov; cam.aspect = a.aspect; cam.near = 0.3; cam.far = 400;
  cam.position.set(a.eye[0], a.eye[1], -a.eye[2]); cam.up.set(0, 1, 0); cam.lookAt(a.at[0], a.at[1], -a.at[2]);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}

// The aerial camera for a shot: looking down on the shot's centre, turned by rot, tilted back by the shot's tilt (the
// 2D scene squeezes depth by 1 - 0.45 tilt, which is what a camera tilted back by acos of that sees), framing span
// metres up the picture with the centre 56% of the way down it. World space is the scene's with Z mirrored.
// alt: the drone's height; what's above it (the chhatris, the bulb strings) isn't in its picture
export function aimFeed(cam, a, alt = 10) {
  const phi = Math.acos(Math.max(0.2, Math.min(1, 1 - 0.45 * a.tilt))), cr = Math.cos(a.rot), sr = Math.sin(a.rot);
  const up = new THREE.Vector3(sr, 0, -cr), focus = new THREE.Vector3(a.fx, 0, -a.fz);
  cam.position.copy(focus).addScaledVector(new THREE.Vector3(0, 1, 0), Math.cos(phi) * 90).addScaledVector(up, -Math.sin(phi) * 90);
  cam.up.copy(up); cam.lookAt(focus);
  const hw = a.span * a.aspect / 2;
  cam.left = -hw; cam.right = hw; cam.top = 0.56 * a.span; cam.bottom = -0.44 * a.span; cam.near = Math.max(5, 90 - Math.max(3, alt - 1) / Math.cos(phi)); cam.far = 200;
  cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}

// The LED screen's face for the drone's picture: the aerial shown crisp; a close shot's small picture softened by a
// small blur, as the background of a shot focused on its subject is
export function feedMaterial(gain) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: null }, texel: { value: new THREE.Vector2(1 / 256, 1 / 256) }, blur: { value: 0 }, gain: { value: gain } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec2 texel; uniform float blur, gain; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(map, vUv).rgb;
        if (blur > 0.0) {
          vec2 d = texel * blur;
          c = c * 0.25 + (texture2D(map, vUv + vec2(d.x, 0.0)).rgb + texture2D(map, vUv - vec2(d.x, 0.0)).rgb + texture2D(map, vUv + vec2(0.0, d.y)).rgb + texture2D(map, vUv - vec2(0.0, d.y)).rgb) * 0.125
            + (texture2D(map, vUv + d).rgb + texture2D(map, vUv - d).rgb + texture2D(map, vUv + vec2(d.x, -d.y)).rgb + texture2D(map, vUv + vec2(-d.x, d.y)).rgb) * 0.0625;
        }
        gl_FragColor = vec4(c * gain, 1.0);
      }`
  });
}
