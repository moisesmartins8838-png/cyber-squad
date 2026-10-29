const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"]
});
const PORT = Number(process.env.PORT || 3000);
const MAX_PC = 28, TEAM_SIZE = 4, GAME_SECONDS = 300;
const WORLD = { width: 1200, height: 720 };
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, game: "Cyber Squad" }));
app.get("/config", (_req, res) => res.json({ game: "Cyber Squad", maxPc: MAX_PC, teamSize: TEAM_SIZE, gameSeconds: GAME_SECONDS }));

function roomIdForPc(pc) { return `team-${Math.ceil(pc / TEAM_SIZE)}`; }
function rangeForRoom(id) {
  const n = Number(id.split("-")[1]);
  return { first: (n - 1) * TEAM_SIZE + 1, last: n * TEAM_SIZE };
}
function spawnCore() {
  return { id: Math.random().toString(36).slice(2, 10), x: 80 + Math.random() * 1040, y: 125 + Math.random() * 540, collected: false };
}
function getRoom(id) {
  if (!rooms.has(id)) rooms.set(id, { id, players: new Map(), status: "waiting", startedAt: null, endsAt: null, score: 0, cores: Array.from({length:16}, spawnCore), lastBroadcast: 0, resetTimer: null });
  return rooms.get(id);
}
function resetRoom(room) {
  clearTimeout(room.resetTimer);
  room.status = "waiting"; room.startedAt = null; room.endsAt = null; room.score = 0;
  room.cores = Array.from({length:16}, spawnCore);
  for (const p of room.players.values()) { p.x = 120 + (p.slot - 1) * 90; p.y = 360; p.lastMove = 0; }
}
function publicState(room) {
  return {
    roomId: room.id, roomLabel: `Partida ${room.id.split("-")[1]}`, range: rangeForRoom(room.id),
    status: room.status, score: room.score,
    secondsLeft: room.status === "playing" ? Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000)) : GAME_SECONDS,
    players: [...room.players.values()].map(p => ({ id:p.id, pc:p.pc, slot:p.slot, name:`Agente ${p.pc}`, x:p.x, y:p.y, color:["#55e6ff","#bd7bff","#6dffb0","#ffbd5c"][p.slot-1] })),
    cores: room.cores.filter(c => !c.collected), world: WORLD, connected: room.players.size, required: TEAM_SIZE
  };
}
function emitRoom(room) { io.to(room.id).emit("state", publicState(room)); }
function startRoom(room) {
  if (room.players.size !== TEAM_SIZE || room.status === "playing") return;
  room.status = "playing"; room.startedAt = Date.now(); room.endsAt = room.startedAt + GAME_SECONDS * 1000;
  room.score = 0; room.cores = Array.from({length:16}, spawnCore);
  io.to(room.id).emit("gameStarted", { seconds: GAME_SECONDS }); emitRoom(room);
}
function tryStart(room) { if (room.status === "waiting" && room.players.size === TEAM_SIZE) startRoom(room); }

io.on("connection", socket => {
  socket.on("join", payload => {
    const pc = Number(payload && payload.pc);
    if (!Number.isInteger(pc) || pc < 1 || pc > MAX_PC) return socket.emit("joinError", "Número inválido. Use PC 1 a 28.");
    const room = getRoom(roomIdForPc(pc));
    const existing = [...room.players.values()].find(p => p.pc === pc && p.id !== socket.id);
    if (existing) return socket.emit("joinError", `O computador ${pc} já está conectado.`);
    if (room.status === "playing" && !room.players.has(socket.id)) return socket.emit("joinError", "A partida já começou. Aguarde a próxima rodada.");
    // Rejoining same socket is safe; replace old room membership if needed.
    const oldRoom = socket.data.roomId && rooms.get(socket.data.roomId);
    if (oldRoom && oldRoom.id !== room.id) oldRoom.players.delete(socket.id);
    socket.join(room.id); socket.data.roomId = room.id; socket.data.pc = pc;
    const slot = ((pc - 1) % TEAM_SIZE) + 1;
    if (!room.players.has(socket.id)) room.players.set(socket.id, {id:socket.id,pc,slot,x:120+(slot-1)*90,y:360,lastMove:0});
    emitRoom(room);
    io.to(room.id).emit("lobby", {connected:room.players.size,required:TEAM_SIZE,message:`Aguardando jogadores: ${room.players.size}/4`});
    tryStart(room);
  });
  socket.on("move", input => {
    const room = rooms.get(socket.data.roomId), p = room && room.players.get(socket.id);
    if (!room || !p || room.status !== "playing") return;
    const now = Date.now(); if (now - p.lastMove < 35) return; p.lastMove = now;
    let dx = Math.max(-1, Math.min(1, Number(input && input.dx) || 0));
    let dy = Math.max(-1, Math.min(1, Number(input && input.dy) || 0));
    const len = Math.hypot(dx,dy) || 1, speed = 7;
    p.x = Math.max(32,Math.min(WORLD.width-32,p.x+dx/len*speed));
    p.y = Math.max(100,Math.min(WORLD.height-32,p.y+dy/len*speed));
    for (const c of room.cores) if (!c.collected && Math.hypot(c.x-p.x,c.y-p.y)<32) {
      c.collected = true; room.score += 10; io.to(room.id).emit("coreCollected",{pc:p.pc,score:room.score});
    }
  });
  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.roomId); if (!room) return;
    room.players.delete(socket.id);
    if (room.players.size === 0 && room.status !== "playing") resetRoom(room);
    else if (room.status === "playing") io.to(room.id).emit("notice","Um agente desconectou. Continuem a missão!");
    emitRoom(room);
    io.to(room.id).emit("lobby",{connected:room.players.size,required:TEAM_SIZE,message:room.status==="playing"?"Missão em andamento":`Aguardando jogadores: ${room.players.size}/4`});
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === "playing" && room.endsAt <= now) {
      room.status = "finished";
      io.to(room.id).emit("gameOver",{score:room.score}); emitRoom(room);
      room.resetTimer = setTimeout(() => {
        if (room.status !== "finished") return;
        resetRoom(room); emitRoom(room);
        io.to(room.id).emit("lobby",{connected:room.players.size,required:TEAM_SIZE,message:`Próxima rodada: ${room.players.size}/4 agentes`});
        tryStart(room);
      }, 10000);
    }
    if (now - room.lastBroadcast > 75) { room.lastBroadcast = now; emitRoom(room); }
  }
}, 50);

server.listen(PORT, "0.0.0.0", () => console.log(`Cyber Squad listening on port ${PORT}`));