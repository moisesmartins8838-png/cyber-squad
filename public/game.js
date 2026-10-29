(() => {
 const canvas=document.getElementById("game"),ctx=canvas.getContext("2d"),$=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search),pc=Number(params.get("pc"))||1;
 $("pcLabel").textContent=`COMPUTADOR ${String(Math.max(1,Math.min(28,pc))).padStart(2,"0")}`;
 let state=null,status="preview",socket=null,keys=new Set(),toastTimer=null,lastMoveSent=0;
 const isOnline=typeof window.io==="function";
 const colors=["#55e6ff","#bd7bff","#6dffb0","#ffbd5c"];
 const stars=Array.from({length:85},()=>({x:Math.random()*1200,y:Math.random()*720,r:Math.random()*1.5+.3,a:Math.random()*.45+.15}));
 function toast(m){$("toast").textContent=m;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2400)}
 function overlay(t,p,s="CYBER SQUAD • MISSÃO 28"){$("overlayTitle").textContent=t;$("overlayText").textContent=p;$("overlaySmall").textContent=s;$("overlay").classList.remove("hidden")}
 function hide(){$("overlay").classList.add("hidden")}
 function formatTime(s){s=Math.max(0,s||0);return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
 function makePreviewState(){
   let players=Array.from({length:4},(_,i)=>({id:"demo"+i,pc:Math.floor((pc-1)/4)*4+i+1,slot:i+1,x:130+i*90,y:365,color:colors[i]}));
   return {roomId:`team-${Math.ceil(pc/4)}`,roomLabel:`Partida ${Math.ceil(pc/4)}`,status:"waiting",score:0,secondsLeft:300,players,cores:Array.from({length:16},(_,i)=>({id:"c"+i,x:100+Math.random()*1000,y:135+Math.random()*540,collected:false})),connected:4,required:4};
 }
 function renderPlayers(ps){$("players").innerHTML=ps.length?ps.slice().sort((a,b)=>a.slot-b.slot).map(p=>`<div class="player"><span class="player-dot" style="color:${p.color};background:${p.color}"></span><div><div class="player-name">${p.name||"Agente "+p.pc}${p.id==="local"?" (VOCÊ)":""}</div><div class="player-sub">Computador ${String(p.pc).padStart(2,"0")}</div></div><span class="player-state">${isOnline?"ONLINE":"DEMO"}</span></div>`).join(""):'<div class="empty">Nenhum agente conectado.</div>'}
 function applyState(s){
   state=s;$("roomLabel").textContent=(s.roomLabel||"PARTIDA").toUpperCase();$("teamCount").textContent=`${s.connected}/4 AGENTES`;$("score").textContent=String(s.score).padStart(4,"0");$("timer").textContent=formatTime(s.secondsLeft);$("roundStatus").textContent=s.status==="playing"?"MISSÃO EM ANDAMENTO":s.status==="finished"?"MISSÃO CONCLUÍDA":"AGUARDANDO EQUIPE";const got=16-s.cores.length;$("coresCount").textContent=got;$("progress").style.width=`${got/16*100}%`;renderPlayers(s.players);
 }
 if(isOnline){
   socket=window.io({transports:["websocket","polling"]});
   $("connection").textContent="Conectando ao servidor...";
   socket.on("connect",()=>{ $("connection").textContent="Conectado ao servidor";document.querySelector(".pulse").style.background="#6dffb0";socket.emit("join",{pc}); });
   socket.on("disconnect",()=>{ $("connection").textContent="Conexão perdida";document.querySelector(".pulse").style.background="#ff6b7c";overlay("Conexão perdida","Verifique a conexão com a internet. O jogo tentará reconectar automaticamente."); });
   socket.on("connect_error",()=>{$("connection").textContent="Tentando reconectar..."});
   socket.on("joinError",m=>overlay("Não foi possível entrar",m,"VERIFIQUE O NÚMERO DO PC"));
   socket.on("lobby",d=>overlay("Aguardando sua equipe",d.message,"PARTIDA EM GRUPO"));
   socket.on("state",s=>{applyState(s);if(s.status==="playing"){status="playing";hide();$("headline").textContent="Recupere os núcleos";$("subheadline").textContent="Cada núcleo vale 10 pontos. A pontuação é compartilhada."}else if(s.status==="waiting"){status="waiting";overlay("Aguardando sua equipe",`Partida ${s.roomId.split("-")[1]}: conecte os 4 computadores (${s.connected}/4).`,"A PARTIDA COMEÇA AUTOMATICAMENTE")}else{status="finished";overlay("Missão concluída!",`Sua equipe fez ${s.score} pontos. Prepare-se para a próxima rodada.`,"RESULTADO DA EQUIPE")}});
   socket.on("gameStarted",()=>toast("Equipe completa! Missão iniciada."));socket.on("coreCollected",d=>toast(`Núcleo recuperado pelo PC ${d.pc}! +10 pontos para a equipe.`));socket.on("notice",toast);socket.on("gameOver",d=>overlay("Tempo esgotado!",`Pontuação final da equipe: ${d.score} pontos.`,"MISSÃO CONCLUÍDA"));
 }else{
   $("connection").textContent="Prévia visual local";
   document.querySelector(".pulse").style.background="#ffbd5c";
   state=makePreviewState();applyState(state);
   overlay("Prévia visual do Cyber Squad","O visual e os controles estão em modo demonstração. Para partidas multiplayer, publique o servidor online e abra o endereço HTTPS fornecido pela hospedagem.","MODO DEMONSTRAÇÃO • SEM MULTIPLAYER");
   $("headline").textContent="Conheça a missão";$("subheadline").textContent="Esta prévia confirma que o visual está funcionando.";
   // Local movement demo only; no shared multiplayer in Live Server.
 }
 function background(){ctx.fillStyle="#0a1222";ctx.fillRect(0,0,1200,720);ctx.strokeStyle="rgba(83,132,180,.10)";ctx.lineWidth=1;for(let x=0;x<1200;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke()}for(let y=0;y<720;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1200,y);ctx.stroke()}stars.forEach(s=>{ctx.globalAlpha=s.a;ctx.fillStyle="#9bbcff";ctx.fillRect(s.x,s.y,s.r,s.r)});ctx.globalAlpha=1;ctx.strokeStyle="rgba(85,230,255,.13)";ctx.lineWidth=2;for(let i=0;i<7;i++){let y=125+i*82;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(75,y);ctx.lineTo(105,y+22);ctx.lineTo(210,y+22);ctx.stroke()}let pulse=1+Math.sin(Date.now()/300)*.06;ctx.save();ctx.translate(600,365);ctx.scale(pulse,pulse);ctx.shadowBlur=35;ctx.shadowColor="#7b61ff";ctx.strokeStyle="rgba(169,138,255,.48)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,90,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,72,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(100,65,190,.12)";ctx.beginPath();ctx.arc(0,0,64,0,Math.PI*2);ctx.fill();ctx.shadowBlur=18;ctx.fillStyle="#a98aff";ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(25,0);ctx.lineTo(0,34);ctx.lineTo(-25,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.font="bold 10px Inter";ctx.textAlign="center";ctx.fillText("NÚCLEO CENTRAL",0,118);ctx.restore();ctx.strokeStyle="rgba(85,230,255,.25)";ctx.lineWidth=2;ctx.strokeRect(14,92,1172,614)}
 function drawCore(c){let p=1+Math.sin(Date.now()/180+c.x)*.14;ctx.save();ctx.translate(c.x,c.y);ctx.scale(p,p);ctx.shadowBlur=24;ctx.shadowColor="#55e6ff";ctx.fillStyle="#55e6ff";ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(10,0);ctx.lineTo(0,12);ctx.lineTo(-10,0);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#d9fbff";ctx.stroke();ctx.restore()}
 function drawPlayer(p){ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=22;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#0b1222";ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(2,-2,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,0,20,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;ctx.textAlign="center";ctx.font="bold 11px Inter";ctx.fillStyle="#eaf5ff";ctx.shadowColor="#000";ctx.shadowBlur=5;ctx.fillText(`PC ${p.pc}`,0,34);ctx.restore()}
 function draw(){background();if(state){state.cores.filter(c=>!c.collected).forEach(drawCore);state.players.forEach(drawPlayer);if(state.status!=="playing"){ctx.fillStyle="rgba(4,8,18,.32)";ctx.fillRect(14,92,1172,614);ctx.textAlign="center";ctx.fillStyle="#e9f4ff";ctx.font="bold 20px Orbitron";ctx.fillText(isOnline?"EQUIPE EM FORMAÇÃO":"PRÉVIA DO JOGO",600,315);ctx.fillStyle="#9eacc9";ctx.font="14px Inter";ctx.fillText(isOnline?`Conecte os computadores do grupo • ${state.connected}/4`:"Visual de demonstração carregado",600,346)}}requestAnimationFrame(draw)}
 function movement(){if(state&&(!isOnline||status==="playing")){let dx=0,dy=0;if(keys.has("arrowleft")||keys.has("a"))dx--;if(keys.has("arrowright")||keys.has("d"))dx++;if(keys.has("arrowup")||keys.has("w"))dy--;if(keys.has("arrowdown")||keys.has("s"))dy++;if(dx||dy){if(isOnline){let now=performance.now();if(now-lastMoveSent>45){socket.emit("move",{dx,dy});lastMoveSent=now}}else{let p=state.players[0];p.x=Math.max(32,Math.min(1168,p.x+dx*4));p.y=Math.max(100,Math.min(688,p.y+dy*4))}}}requestAnimationFrame(movement)}
 addEventListener("keydown",e=>{let k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();keys.add(k)});addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));addEventListener("blur",()=>keys.clear());draw();movement();
})();