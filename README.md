# CYBER SQUAD 3D — Missão 28

Versão experimental 3D do jogo cooperativo para 28 computadores, com sete salas de quatro jogadores. Cada equipe tem 5 minutos para coletar núcleos e ativar quatro relés; cada relé exige dois agentes diferentes pressionando E perto dele.

## Controles
- WASD ou setas: mover
- Shift: correr (reservado para a próxima melhoria; o movimento básico já está disponível)
- E: enviar sinal/ajudar a ativar um relé
- Arrastar o mouse sobre o jogo: girar a câmera; clique direito também ativa captura do mouse quando o navegador permitir
- Chat e mensagens rápidas: combinar a estratégia

## Personagens 3D
O jogo tenta carregar o modelo de personagem animado `Soldier.glb` dos exemplos públicos do Three.js (`https://threejs.org/examples/models/gltf/Soldier.glb`). O código mantém um personagem 3D de reserva caso o modelo externo não carregue. A cena 3D usa Three.js via CDN, então os computadores precisam ter acesso à internet.

A documentação do Three.js recomenda glTF/GLB para modelos 3D de runtime: https://threejs.org/manual/pages/loading-3d-models.html. Os pacotes de modelos 3D CC0 de Kenney também são uma fonte de assets gratuitos: https://kenney.nl/assets.

## Publicar no Render
1. Extraia este ZIP.
2. Copie os arquivos para a pasta do repositório conectado ao Render, mantendo a pasta `.git`.
3. Execute:
   ```powershell
   git add .
   git commit -m "Adiciona versão 3D cooperativa"
   git push
   ```
4. Aguarde o deploy terminar.
5. Teste com `https://SEU-SITE.onrender.com/?pc=1`, `?pc=2`, `?pc=3` e `?pc=4`.

## Observações
- O servidor usa Node.js e Socket.IO; os computadores dos alunos só precisam do navegador.
- Cada número de PC é fixo: 1–4 sala 1, 5–8 sala 2, ... 25–28 sala 7.
- A primeira versão 3D é um protótipo jogável e precisa ser testada no endereço publicado com quatro navegadores antes de ser usada com a turma toda.
