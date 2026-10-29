const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const path=require('path');
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static(path.join(__dirname,'public')));
app.get('/health',(_,res)=>res.json({ok:true,game:'Sparrow Duo Space'}));
const rooms=new Map(), clients=new Map();
const COLORS=['#58efff','#ff6dba'];
function roomId(pc){return 'duo-'+Math.ceil(pc/2)}
function newRoom(id){return {id,players:[],score:0,time:300,status:'waiting',ship:{x:500,y:490,hp:100,shield:100},enemies:[],bullets:[],enemyBullets:[],gems:[],nextId:1,skill:null,skillCooldown:0,lastSpawn:0,lastTick:Date.now(),combo:0,round:1}}
function roomFor(pc){const id=roomId(pc);if(!rooms.has(id))rooms.set(id,newRoom(id));return rooms.get(id)}
function publicState(r){return {roomId:r.id,players:r.players.map(p=>({pc:p.pc,role:p.role,connected:!!p.socketId,name:p.name})),score:r.score,time:Math.ceil(r.time),status:r.status,ship:r.ship,enemies:r.enemies,bullets:r.bullets,gems:r.gems,skill:r.skill,skillCooldown:Math.ceil(r.skillCooldown),combo:r.combo,round:r.round}}
function emit(r){io.to(r.id).emit('state',publicState(r))}
function addEnemy(r){const id=r.nextId++;r.enemies.push({id,x:40+Math.random()*920,y:-35,hp:Math.random()<.2?3:1,r:14+Math.random()*11,speed:45+Math.random()*55,value:Math.random()<.15?30:10,type:Math.random()<.15?'elite':'rock',spin:Math.random()*6})}
function endRound(r){r.status='finished';io.to(r.id).emit('roundEnd',{score:r.score,won:r.score>=1000});emit(r)}
function tick(r,dt,now){if(r.status!=='playing')return;r.time-=dt;if(r.time<=0){r.time=0;endRound(r);return}
r.skillCooldown=Math.max(0,r.skillCooldown-dt);
if(now-r.lastSpawn>850){addEnemy(r);r.lastSpawn=now}
for(const e of r.enemies){e.y+=e.speed*dt;e.spin+=dt; if(e.y>550){e.y=550;e.speed=0}}
for(const b of r.bullets)b.y-=520*dt;
for(const b of r.enemyBullets)b.y+=210*dt;
r.bullets=r.bullets.filter(b=>b.y>-30);r.enemyBullets=r.enemyBullets.filter(b=>b.y<560);
for(let i=r.enemies.length-1;i>=0;i--){const e=r.enemies[i];let hit=false;for(let j=r.bullets.length-1;j>=0;j--){const b=r.bullets[j];if(Math.hypot(b.x-e.x,b.y-e.y)<e.r+5){r.bullets.splice(j,1);e.hp--;if(e.hp<=0){r.score+=e.value;r.combo++;if(r.combo%10===0)r.score+=50;r.gems.push({id:r.nextId++,x:e.x,y:e.y,value:10});r.enemies.splice(i,1);hit=true;break}}}if(hit)continue;if(Math.hypot(e.x-r.ship.x,e.y-r.ship.y)<e.r+18){r.ship.hp=Math.max(0,r.ship.hp-12);r.enemies.splice(i,1);if(r.ship.hp<=0)endRound(r)}}
for(let i=r.gems.length-1;i>=0;i--){const g=r.gems[i];g.y+=80*dt;if(Math.hypot(g.x-r.ship.x,g.y-r.ship.y)<27){r.score+=g.value;r.gems.splice(i,1)}else if(g.y>560)r.gems.splice(i,1)}
if(r.score>=1000)endRound(r);
}
setInterval(()=>{const now=Date.now();for(const r of rooms.values()){const dt=Math.min(.05,(now-r.lastTick)/1000);r.lastTick=now;tick(r,dt,now);emit(r)}},50);
io.on('connection',socket=>{
socket.on('join',data=>{const pc=Number(data?.pc);if(!Number.isInteger(pc)||pc<1||pc>28){socket.emit('joinError','Use um endereço com ?pc=1 até ?pc=28.');return}
const r=roomFor(pc);const role=pc%2===1?'pilot':'gunner';const existing=r.players.find(p=>p.pc===pc);if(existing&&existing.socketId!==socket.id){io.to(existing.socketId).emit('notice','Esta estação foi aberta em outra janela.');}
if(existing){existing.socketId=socket.id}else r.players.push({pc,role,socketId:socket.id,name:role==='pilot'?'Piloto':'Artilheiro'});
socket.data.pc=pc;socket.data.room=r.id;socket.join(r.id);
if(r.players.length>=2&&r.status==='waiting'){r.status='playing';r.time=300;r.lastTick=Date.now();r.lastSpawn=Date.now();socket.emit('notice','Dupla conectada! Piloto controla a nave; artilheiro dispara.');io.to(r.id).emit('notice','MISSÃO INICIADA! Cheguem a 1000 pontos.')}
emit(r);
});
socket.on('move',d=>{const r=rooms.get(socket.data.room),pc=socket.data.pc;if(!r||r.status!=='playing'||pc%2===0)return;const dx=Math.max(-1,Math.min(1,Number(d?.dx)||0)),dy=Math.max(-1,Math.min(1,Number(d?.dy)||0));r.ship.x=Math.max(25,Math.min(975,r.ship.x+dx*260*.05));r.ship.y=Math.max(60,Math.min(510,r.ship.y+dy*260*.05));});
socket.on('shoot',()=>{const r=rooms.get(socket.data.room),pc=socket.data.pc;if(!r||r.status!=='playing'||pc%2!==0)return;if(r.bullets.length<40)r.bullets.push({id:r.nextId++,x:r.ship.x-8,y:r.ship.y-18},{id:r.nextId++,x:r.ship.x+8,y:r.ship.y-18})});
socket.on('requestSkill',()=>{const r=rooms.get(socket.data.room),pc=socket.data.pc;if(!r||r.status!=='playing'||pc%2!==0)return;r.skill={requestedBy:pc,expires:Date.now()+6000};io.to(r.id).emit('notice','Artilheiro pediu habilidade! Piloto pressione V para aceitar.')});
socket.on('approveSkill',()=>{const r=rooms.get(socket.data.room),pc=socket.data.pc;if(!r||r.status!=='playing'||pc%2!==1||!r.skill||r.skill.expires<Date.now()||r.skillCooldown>0)return;r.skill=null;r.skillCooldown=18;r.ship.shield=100;r.enemies.forEach(e=>{if(Math.hypot(e.x-r.ship.x,e.y-r.ship.y)<180){r.score+=e.value;r.enemies=r.enemies.filter(x=>x!==e)}});r.score+=50;io.to(r.id).emit('skillUsed',{score:r.score});io.to(r.id).emit('notice','HABILIDADE APROVADA! Pulso de energia +50 pontos.')});
socket.on('chat',d=>{const r=rooms.get(socket.data.room);if(!r)return;const p=r.players.find(p=>p.pc===socket.data.pc);if(!p)return;io.to(r.id).emit('chatMessage',{pc:p.pc,role:p.role,message:String(d?.message||'').slice(0,120)})});
socket.on('reset',()=>{const r=rooms.get(socket.data.room);if(!r||socket.data.pc%2!==1)return;const id=r.id;Object.assign(r,newRoom(id));r.players=r.players.filter(p=>p.socketId);emit(r);io.to(r.id).emit('notice','Nova partida preparada.')});
socket.on('disconnect',()=>{const r=rooms.get(socket.data.room);if(!r)return;const p=r.players.find(p=>p.socketId===socket.id);if(p)p.socketId=null;emit(r)});
});
const port=process.env.PORT||3000;server.listen(port,'0.0.0.0',()=>console.log('Sparrow Duo ouvindo na porta '+port));
