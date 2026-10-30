const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true, game: 'Sparrow Duo Space', version: '2.0.0' }));

const rooms = new Map();
const W = 1000, H = 650;
function roomId(pc) { return 'duo-' + Math.ceil(pc / 2); }
function newRoom(id) {
  return { id, players: [], score: 0, time: 300, status: 'waiting', phase: 'asteroids',
    ship: { x: 500, y: 555, hp: 100, shield: 100 }, enemies: [], bullets: [],
    enemyBullets: [], gems: [], boss: null, nextId: 1, skill: null,
    skillCooldown: 0, lastSpawn: 0, lastEnemyShot: 0, lastBossShot: 0,
    lastTick: Date.now(), combo: 0 };
}
function roomFor(pc) { const id = roomId(pc); if (!rooms.has(id)) rooms.set(id, newRoom(id)); return rooms.get(id); }
function publicState(r) {
  return { roomId: r.id, players: r.players.map(p => ({ pc: p.pc, role: p.role, connected: !!p.socketId, name: p.name })),
    score: r.score, time: Math.ceil(r.time), status: r.status, phase: r.phase, ship: r.ship,
    enemies: r.enemies, bullets: r.bullets, enemyBullets: r.enemyBullets, gems: r.gems,
    boss: r.boss, skill: r.skill, skillCooldown: Math.ceil(r.skillCooldown), combo: r.combo };
}
function emit(r) { io.to(r.id).emit('state', publicState(r)); }
function addAsteroid(r) {
  r.enemies.push({ id: r.nextId++, kind: 'rock', x: 35 + Math.random() * 930, y: -35,
    hp: Math.random() < .2 ? 3 : 1, radius: 14 + Math.random() * 12,
    vx: (Math.random() - .5) * 42, vy: 95 + Math.random() * 75, value: 10, spin: Math.random() * 6 });
}
function addRaider(r) {
  r.enemies.push({ id: r.nextId++, kind: 'raider', x: 70 + Math.random() * 860, y: -45,
    hp: 3, radius: 21, vx: (Math.random() - .5) * 75, vy: 65 + Math.random() * 35,
    value: 25, shot: Math.random() * .8, phase: Math.random() * 6 });
}
function startBoss(r) {
  if (r.phase === 'boss' || r.phase === 'victory') return;
  r.phase = 'boss'; r.boss = { x: W / 2, y: 125, hp: 180, maxHp: 180, dir: 1, phase: 0, attack: 0 };
  r.enemies = []; r.enemyBullets = []; r.gems = [];
  io.to(r.id).emit('notice', '⚠ ALERTA: CHEFE FINAL DETECTADO! Destruam a nave colossal!');
  io.to(r.id).emit('bossStart');
}
function finish(r, won) {
  if (r.status === 'finished') return;
  r.status = 'finished'; r.phase = won ? 'victory' : r.phase;
  io.to(r.id).emit('roundEnd', { score: r.score, won, bossDefeated: won });
}
function damageShip(r, amount) {
  if (r.ship.shield > 0) { const absorbed = Math.min(r.ship.shield, amount); r.ship.shield -= absorbed; amount -= absorbed; }
  if (amount > 0) r.ship.hp = Math.max(0, r.ship.hp - amount);
  if (r.ship.hp <= 0) finish(r, false);
}
function tick(r, dt, now) {
  if (r.status !== 'playing') return;
  r.time = Math.max(0, r.time - dt);
  if (r.time <= 0) { finish(r, false); return; }
  r.skillCooldown = Math.max(0, r.skillCooldown - dt);
  for (const b of r.bullets) b.y -= 590 * dt;
  r.bullets = r.bullets.filter(b => b.y > -30);

  if (r.phase === 'asteroids') {
    if (now - r.lastSpawn > 700) { addAsteroid(r); if (Math.random() < .42) addRaider(r); r.lastSpawn = now; }
    for (const e of r.enemies) {
      e.x += (e.vx || 0) * dt; e.y += e.vy * dt; e.spin = (e.spin || 0) + dt;
      if (e.kind === 'raider') {
        e.x += Math.sin(now / 450 + e.phase) * 38 * dt;
        e.shot -= dt;
        if (e.shot <= 0) { e.shot = 1.25 + Math.random() * .55; r.enemyBullets.push({ id: r.nextId++, x: e.x, y: e.y + 15, vx: (r.ship.x - e.x) * .12, vy: 230, radius: 5, kind: 'enemy' }); }
      }
    }
    // Asteroides e naves saem da arena; não ficam presos na borda inferior.
    r.enemies = r.enemies.filter(e => e.y < H + 60 && e.x > -70 && e.x < W + 70);
    if (r.score >= 500) startBoss(r);
  } else if (r.phase === 'boss' && r.boss) {
    const b = r.boss; b.phase += dt; b.x += b.dir * (95 + Math.sin(b.phase * 1.7) * 45) * dt;
    if (b.x > 825) b.dir = -1; if (b.x < 175) b.dir = 1;
    b.attack -= dt;
    if (b.attack <= 0) {
      b.attack = Math.max(.48, 1.05 - (1 - b.hp / b.maxHp) * .42);
      const aimed = Math.atan2(r.ship.y - (b.y + 48), r.ship.x - b.x);
      for (let k = -1; k <= 1; k++) { const a = aimed + k * .22; r.enemyBullets.push({ id: r.nextId++, x: b.x, y: b.y + 48, vx: Math.cos(a) * 245, vy: Math.sin(a) * 245, radius: 7, kind: 'boss' }); }
      if (b.hp < b.maxHp * .5) for (const off of [-95, 95]) r.enemyBullets.push({ id: r.nextId++, x: b.x + off, y: b.y + 35, vx: off * 1.1, vy: 245, radius: 6, kind: 'boss' });
    }
  }

  for (const eb of r.enemyBullets) { eb.x += (eb.vx || 0) * dt; eb.y += (eb.vy || 210) * dt; }
  for (let i = r.enemyBullets.length - 1; i >= 0; i--) {
    const eb = r.enemyBullets[i];
    if (Math.hypot(eb.x - r.ship.x, eb.y - r.ship.y) < (eb.radius || 6) + 17) { r.enemyBullets.splice(i, 1); damageShip(r, eb.kind === 'boss' ? 9 : 7); }
  }
  r.enemyBullets = r.enemyBullets.filter(b => b.y < H + 30 && b.x > -30 && b.x < W + 30);

  if (r.phase === 'asteroids') {
    for (let i = r.enemies.length - 1; i >= 0; i--) {
      const e = r.enemies[i];
      for (let j = r.bullets.length - 1; j >= 0; j--) {
        const shot = r.bullets[j];
        if (Math.hypot(shot.x - e.x, shot.y - e.y) < e.radius + 6) {
          r.bullets.splice(j, 1); e.hp--;
          if (e.hp <= 0) { r.score += e.value; r.combo++; if (r.combo % 10 === 0) r.score += 50; if (Math.random() < .5) r.gems.push({ id: r.nextId++, x: e.x, y: e.y, value: 10 }); r.enemies.splice(i, 1); }
          break;
        }
      }
      if (r.enemies.includes(e) && Math.hypot(e.x - r.ship.x, e.y - r.ship.y) < e.radius + 18) { r.enemies.splice(i, 1); damageShip(r, e.kind === 'raider' ? 16 : 12); }
    }
    for (let i = r.gems.length - 1; i >= 0; i--) { const g = r.gems[i]; g.y += 85 * dt; if (Math.hypot(g.x - r.ship.x, g.y - r.ship.y) < 27) { r.score += g.value; r.gems.splice(i, 1); } else if (g.y > H + 20) r.gems.splice(i, 1); }
  } else if (r.phase === 'boss' && r.boss) {
    const b = r.boss;
    for (let i = r.bullets.length - 1; i >= 0; i--) { const shot = r.bullets[i]; if (Math.abs(shot.x - b.x) < 100 && Math.abs(shot.y - b.y) < 65) { r.bullets.splice(i, 1); b.hp -= 1; if (b.hp <= 0) { b.hp = 0; r.score += 500; finish(r, true); break; } } }
  }
  emit(r);
}
setInterval(() => { const now = Date.now(); for (const r of rooms.values()) { const dt = Math.min(.05, (now - r.lastTick) / 1000); r.lastTick = now; tick(r, dt, now); } }, 50);

io.on('connection', socket => {
  socket.on('join', data => {
    const pc = Number(data?.pc);
    if (!Number.isInteger(pc) || pc < 1 || pc > 28) { socket.emit('joinError', 'Use um endereço com ?pc=1 até ?pc=28.'); return; }
    const r = roomFor(pc), role = pc % 2 ? 'pilot' : 'gunner';
    const old = r.players.find(p => p.pc === pc);
    if (old && old.socketId && old.socketId !== socket.id) io.to(old.socketId).emit('notice', 'Esta estação foi aberta em outra janela.');
    if (old) old.socketId = socket.id; else r.players.push({ pc, role, socketId: socket.id, name: role === 'pilot' ? 'Piloto' : 'Artilheiro' });
    socket.data.pc = pc; socket.data.room = r.id; socket.join(r.id);
    if (r.players.length >= 2 && r.status === 'waiting') { r.status = 'playing'; r.time = 300; r.lastTick = Date.now(); r.lastSpawn = Date.now(); io.to(r.id).emit('notice', 'MISSÃO INICIADA! Façam 500 pontos e preparem-se para o chefe.'); }
    emit(r);
  });
  socket.on('move', d => { const r = rooms.get(socket.data.room); if (!r || r.status !== 'playing' || socket.data.pc % 2 === 0) return; const dx = Math.max(-1, Math.min(1, Number(d?.dx) || 0)), dy = Math.max(-1, Math.min(1, Number(d?.dy) || 0)); r.ship.x = Math.max(25, Math.min(975, r.ship.x + dx * 310 * .016)); r.ship.y = Math.max(65, Math.min(605, r.ship.y + dy * 310 * .016)); });
  socket.on('shoot', () => { const r = rooms.get(socket.data.room); if (!r || r.status !== 'playing' || socket.data.pc % 2 !== 0) return; if (r.bullets.length < 50) r.bullets.push({ id: r.nextId++, x: r.ship.x - 9, y: r.ship.y - 18 }, { id: r.nextId++, x: r.ship.x + 9, y: r.ship.y - 18 }); });
  socket.on('requestSkill', () => { const r = rooms.get(socket.data.room); if (!r || r.status !== 'playing' || socket.data.pc % 2 !== 0) return; r.skill = { requestedBy: socket.data.pc, expires: Date.now() + 6000 }; io.to(r.id).emit('notice', 'Artilheiro pediu habilidade! Piloto pressione V para aceitar.'); emit(r); });
  socket.on('approveSkill', () => { const r = rooms.get(socket.data.room); if (!r || r.status !== 'playing' || socket.data.pc % 2 !== 1 || !r.skill || r.skill.expires < Date.now() || r.skillCooldown > 0) return; r.skill = null; r.skillCooldown = 18; r.ship.shield = 100; if (r.phase === 'asteroids') { for (let i = r.enemies.length - 1; i >= 0; i--) if (Math.hypot(r.enemies[i].x - r.ship.x, r.enemies[i].y - r.ship.y) < 190) { r.score += r.enemies[i].value; r.enemies.splice(i, 1); } } else if (r.boss) r.boss.hp = Math.max(1, r.boss.hp - 18); r.score += 50; io.to(r.id).emit('notice', 'PULSO DE ENERGIA! Escudo restaurado e +50 pontos.'); emit(r); });
  socket.on('chat', d => { const r = rooms.get(socket.data.room); if (!r) return; const p = r.players.find(p => p.pc === socket.data.pc); if (p) io.to(r.id).emit('chatMessage', { pc: p.pc, role: p.role, message: String(d?.message || '').slice(0, 120) }); });
  socket.on('reset', () => { const r = rooms.get(socket.data.room); if (!r || socket.data.pc % 2 !== 1) return; const id = r.id, players = r.players.filter(p => p.socketId); Object.assign(r, newRoom(id)); r.players = players; emit(r); io.to(r.id).emit('notice', 'Nova partida preparada. Aguardando a dupla.'); });
  socket.on('disconnect', () => { const r = rooms.get(socket.data.room); if (!r) return; const p = r.players.find(p => p.socketId === socket.id); if (p) p.socketId = null; emit(r); });
});
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log('Sparrow Duo Space v2.0 ouvindo na porta ' + port));
