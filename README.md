# CYBER SQUAD — versão para computadores escolares sem instalação

Esta versão foi preparada para que os 28 computadores dos visitantes usem **somente o navegador**. O Node.js roda no serviço de hospedagem, não nos computadores da escola.

## Como funciona

- Um servidor hospedado na internet mantém as sete salas multiplayer.
- Cada computador abre uma URL com o seu número, por exemplo `https://SEU-SITE.onrender.com/?pc=1`.
- PCs 1–4 formam a Partida 1; PCs 5–8 formam a Partida 2; e assim por diante até PC 28.
- A partida começa quando os quatro computadores daquela sala entram.
- A rodada dura 5 minutos e depois aparece o resultado. O servidor prepara a próxima rodada automaticamente.

## Publicar usando somente o navegador

Você precisará de uma conta em um serviço de hospedagem compatível com Node.js. A implantação precisa ser feita por alguém autorizado e o plano gratuito do provedor pode ter limites ou suspender o serviço após inatividade. A hospedagem não é criada automaticamente por este ZIP.

### Método sugerido: GitHub + Render

1. Entre no GitHub pelo navegador e crie um repositório novo chamado `cyber-squad`. Se a escola exigir, peça autorização antes de publicar o projeto.
2. Envie os arquivos desta pasta para o repositório, mantendo `server.js`, `package.json`, `render.yaml` e a pasta `public` na raiz. O upload de arquivos pelo site do GitHub pode ser feito pelo botão **Add file → Upload files**.
3. Entre em https://render.com/ e crie uma conta, se o uso for permitido.
4. No Render, escolha **New + → Web Service** e conecte o repositório `cyber-squad`.
5. Confirme as configurações:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/health`
6. Inicie a implantação e aguarde o status `Live`. O provedor fornecerá um endereço HTTPS semelhante a `https://cyber-squad-xxxx.onrender.com`.
7. Abra `https://SEU-ENDERECO/health`. O resultado esperado é um JSON com `"ok": true`.
8. Teste no navegador: `https://SEU-ENDERECO/?pc=1`.

Os nomes exatos dos botões do provedor podem mudar. Se a escola bloquear GitHub ou Render, não tente contornar o bloqueio: peça à equipe de TI para aprovar uma hospedagem compatível.

## Endereços dos computadores

Troque `https://SEU-ENDERECO` pelo endereço HTTPS real criado pelo provedor.

- PC 1: `https://SEU-ENDERECO/?pc=1`
- PC 2: `https://SEU-ENDERECO/?pc=2`
- ...
- PC 28: `https://SEU-ENDERECO/?pc=28`

O final `?pc=N` é o número atribuído a cada computador. Configure um atalho ou favorito em cada navegador para que os visitantes não precisem digitar o endereço. Essa URL não é uma autenticação forte: para uso público, o ideal é que a escola administre os dispositivos e que o servidor tenha controles adicionais contra números duplicados e acessos não autorizados.

## Rede e desempenho

- Os computadores precisam ter acesso ao endereço hospedado e permitir conexões WebSocket/HTTPS.
- A hospedagem deve manter conexões persistentes e suportar o volume de jogadores. Teste primeiro com quatro PCs e depois aumente gradualmente.
- Hospedagem gratuita pode dormir após inatividade, ter limites de uso e provocar atraso ao iniciar. Para um evento escolar, confirme as condições do provedor e considere um plano adequado.
- Não publique dados pessoais dos visitantes; o protótipo usa números de PCs e IDs temporários de sessão.
- Este é um protótipo, não uma versão auditada para operação pública. Teste reconexão, latência e fluxo de rodada antes do evento.

## Arquivos

- `server.js`: salas, conexão, pontuação, cronômetro e lógica multiplayer.
- `public/index.html`: interface.
- `public/style.css`: visual.
- `public/game.js`: desenho do jogo e controles.
- `package.json`: dependências e comando de inicialização.
- `render.yaml`: configuração de implantação para Render.
