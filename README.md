SPARROW DUO SPACE — Jogo cooperativo em dupla

CONTROLES
- Piloto: computador ímpar (PC 1, 3, 5, ... 27). WASD/setas para mover a nave. V aceita a habilidade pedida.
- Artilheiro: computador par (PC 2, 4, 6, ... 28). Espaço ou clique no jogo para atirar. E pede habilidade.
- A habilidade só ativa quando o artilheiro pede e o piloto aceita com V.
- A primeira dupla a atingir 1000 pontos vence; a rodada também tem limite de 5 minutos.
- O painel oferece chat e mensagens rápidas para coordenar a dupla.

TESTE OFFLINE
1. Extraia o ZIP.
2. Abra `public/index.html` com dois cliques no Edge/Chrome.
3. Clique em “Iniciar demonstração”.
4. Escolha PILOTO e mova com WASD/setas. Troque para ARTILHEIRO e mantenha ESPAÇO para atirar.
5. Para testar a habilidade: selecione ARTILHEIRO e pressione E; selecione PILOTO e pressione V.

MULTIPLAYER ONLINE (28 PCs / 14 duplas)
- Requer Node.js no servidor/Render, não nos computadores dos alunos.
- Copie os arquivos do projeto para o repositório do Render e publique com `npm install` e `npm start`.
- URL dos PCs: `https://SEU-SITE.onrender.com/?pc=1` até `?pc=28`.
- PCs 1+2 formam dupla 1; 3+4 dupla 2; ... 27+28 dupla 14.
- Este ZIP é um protótipo inicial. Faça um teste com uma dupla antes de usar em competição. O prêmio é administrado pelo organizador, não há pagamento ou premiação automática no código.

LOCAL PREVIEW NOTE: Abra `public/index.html` pelo Live Server. Os arquivos CSS e JavaScript usam caminhos relativos (`./style.css` e `./game.js`) para funcionar quando o site está em `/public/`.
