// Online rooms over Supabase Realtime. A room is a broadcast channel named after
// a 4-letter code. Presence tells each side who is in the lobby (name, team);
// broadcast messages carry match setup, the host's game state and the guest's
// controls. The host's browser runs the match; the guest mirrors it.

import { supabase } from '../data/cloud.js';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I/L
const JOIN_TIMEOUT_MS = 5000;

export const normalizeCode = (raw) => String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
const makeCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const clientId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

export class Room {
  constructor(code, role, me) {
    this.code = code;
    this.role = role; // 'host' | 'guest'
    this.me = { ...me, role, id: clientId(), joinedAt: Date.now() };
    this.host = role === 'host' ? this.me : null;
    this.guest = role === 'guest' ? this.me : null;
    this.duration = 10;
    this.handlers = new Map();
    this.closed = false;
    this.channel = supabase.channel(`fh26-room-${code}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.me.id } },
    });
    this.channel.on('presence', { event: 'sync' }, () => this.onPresence());
    for (const event of ['setup', 'state', 'event', 'input', 'leave']) {
      this.channel.on('broadcast', { event }, ({ payload }) => this.emit(event, payload));
    }
  }

  // ---------- lifecycle ----------
  subscribe() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), JOIN_TIMEOUT_MS);
      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(new Error(status)); }
      });
    });
  }

  // Supabase only sends the lobby list after we announce ourselves, so track
  // first, then give the list a moment to arrive.
  async announce(waitMs) {
    await this.track();
    await new Promise((r) => setTimeout(r, waitMs));
  }

  // Someone with the same role who got here first.
  beatenBy(role) {
    return this.othersWithRole(role).some((m) => m.joinedAt < this.me.joinedAt || (m.joinedAt === this.me.joinedAt && m.id < this.me.id));
  }

  static async create(me) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const room = new Room(makeCode(), 'host', me);
      try {
        await room.subscribe();
      } catch {
        await room.leave();
        throw new Error('Could not reach the server. Check your connection.');
      }
      await room.announce(700);
      if (!room.beatenBy('host')) return room;
      await room.leave(); // code already taken, try another
    }
    throw new Error('Could not create a room. Please try again.');
  }

  static async join(rawCode, me) {
    const code = normalizeCode(rawCode);
    if (code.length !== 4) throw new Error('Room codes have 4 characters.');
    const room = new Room(code, 'guest', me);
    try {
      await room.subscribe();
    } catch {
      await room.leave();
      throw new Error('Could not reach the server. Check your connection.');
    }
    await room.announce(1500);
    if (!room.othersWithRole('host').length) await new Promise((r) => setTimeout(r, 1500)); // slow network
    if (!room.othersWithRole('host').length) {
      await room.leave();
      throw new Error(`No room ${code} found. Check the code with your friend.`);
    }
    if (room.beatenBy('guest')) {
      await room.leave();
      throw new Error(`Room ${code} is already full.`);
    }
    return room;
  }

  async leave() {
    if (this.closed) return;
    this.closed = true;
    try { await this.send('leave', { role: this.role }); } catch { /* best effort */ }
    try { await supabase.removeChannel(this.channel); } catch { /* already gone */ }
    if (current === this) current = null;
  }

  // ---------- presence ----------
  track() {
    const { id, name, teamId, role, joinedAt } = this.me;
    return this.channel.track({ id, name, teamId: teamId || null, role, joinedAt, duration: this.role === 'host' ? this.duration : undefined });
  }

  othersWithRole(role) {
    const state = this.channel.presenceState();
    return Object.entries(state)
      .filter(([key]) => key !== this.me.id)
      .map(([, metas]) => metas[metas.length - 1])
      .filter((m) => m && m.role === role);
  }

  onPresence() {
    this.synced = true;
    const otherRole = this.role === 'host' ? 'guest' : 'host';
    // The earliest arrival is the real opponent; latecomers are turned away.
    const other = this.othersWithRole(otherRole).sort((a, b) => a.joinedAt - b.joinedAt)[0] || null;
    const had = this.role === 'host' ? this.guest : this.host;
    if (this.role === 'host') this.guest = other;
    else {
      this.host = other;
      if (other && other.duration) this.duration = other.duration;
    }
    if (had && !other) this.emit('left', had);
    this.emit('lobby', this.snapshot());
  }

  snapshot() {
    return { code: this.code, role: this.role, host: this.host, guest: this.guest, duration: this.duration };
  }

  async setTeam(teamId) {
    this.me.teamId = teamId;
    await this.track();
    this.emit('lobby', this.snapshot());
  }

  async setDuration(min) {
    this.duration = min;
    if (this.role === 'host') await this.track();
    this.emit('lobby', this.snapshot());
  }

  // ---------- messages ----------
  send(event, payload) {
    if (this.closed && event !== 'leave') return Promise.resolve();
    return this.channel.send({ type: 'broadcast', event, payload });
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return () => this.handlers.get(event).delete(fn);
  }

  once(event, fn) {
    const off = this.on(event, (p) => { off(); fn(p); });
    return off;
  }

  emit(event, payload) {
    const set = this.handlers.get(event);
    if (set) [...set].forEach((fn) => fn(payload));
  }

  inviteUrl() {
    const url = new URL(location.href);
    url.search = `?room=${this.code}`;
    url.hash = '';
    return url.toString();
  }
}

// The room this browser is in, kept across screens (lobby -> team pick -> match).
let current = null;
export const currentRoom = () => current;
export const setCurrentRoom = (room) => { current = room; };
