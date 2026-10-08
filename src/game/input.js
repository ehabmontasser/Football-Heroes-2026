// Touch joystick + action buttons, and keyboard. Produces one snapshot per frame.
//   Move: joystick / WASD / arrows   Pass-Switch: PASS / Space / J
//   Shoot-Tackle: SHOOT (hold to power) / K   Sprint: SPRINT / Shift / L

export class Input {
  constructor({ joystick, knob, passBtn, shootBtn, sprintBtn }) {
    this.keys = new Set();
    this.stick = [0, 0];
    this.touchSprint = false;
    this.touchShoot = false;
    this.pending = { pass: false, shootDown: false, shootUp: false };
    this.prevShoot = false;
    this.listeners = [];

    const on = (el, ev, fn, opts) => {
      el.addEventListener(ev, fn, opts);
      this.listeners.push(() => el.removeEventListener(ev, fn, opts));
    };

    // Keyboard.
    on(window, 'keydown', (e) => {
      const k = e.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === ' ' || k === 'j') this.pending.pass = true;
    });
    on(window, 'keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());

    // Joystick.
    let stickId = null;
    const base = joystick;
    const moveStick = (e) => {
      const r = base.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = r.width / 2;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      this.stick = [dx / max, dy / max];
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    on(base, 'pointerdown', (e) => {
      stickId = e.pointerId;
      base.setPointerCapture(e.pointerId);
      moveStick(e);
    });
    on(base, 'pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
    const endStick = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      this.stick = [0, 0];
      knob.style.transform = '';
    };
    on(base, 'pointerup', endStick);
    on(base, 'pointercancel', endStick);

    // Buttons.
    const hold = (el, down, up) => {
      on(el, 'pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('is-pressed'); down(); });
      const release = () => { el.classList.remove('is-pressed'); up(); };
      on(el, 'pointerup', release);
      on(el, 'pointercancel', release);
    };
    hold(passBtn, () => { this.pending.pass = true; }, () => {});
    hold(shootBtn, () => { this.touchShoot = true; }, () => { this.touchShoot = false; });
    hold(sprintBtn, () => { this.touchSprint = true; }, () => { this.touchSprint = false; });
  }

  // Called once per frame by the game loop.
  snapshot() {
    const k = this.keys;
    let mx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let my = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
    } else {
      [mx, my] = this.stick;
    }
    const shoot = this.touchShoot || k.has('k');
    const snap = {
      move: [mx, my],
      sprint: this.touchSprint || k.has('shift') || k.has('l'),
      passPressed: this.pending.pass,
      shootDown: shoot,
      shootPressed: shoot && !this.prevShoot,
      shootReleased: !shoot && this.prevShoot,
    };
    this.prevShoot = shoot;
    this.pending.pass = false;
    return snap;
  }

  reset() {
    this.keys.clear();
    this.stick = [0, 0];
    this.touchShoot = false;
    this.touchSprint = false;
    this.prevShoot = false;
    this.pending.pass = false;
  }

  destroy() {
    this.listeners.forEach((off) => off());
  }
}
