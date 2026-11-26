<p align="center">
  <img src="public/checkmage.svg" alt="Logo do Checkmage: um bispo dourado com chapéu de mago dentro de um emblema hexagonal" width="132" />
</p>

<h1 align="center">Checkmage</h1>

<p align="center">
  <b>Xadrez com magia.</b> Eventos, cartas e classes transformam cada partida em um duelo imprevisível,<br />
  para jogar sozinho no mesmo computador ou online contra um amigo.
</p>

<p align="center">
  <a href="https://checkmage.onrender.com"><b>▶ Jogar agora</b></a> ·
  <a href="#como-executar">Executar localmente</a> ·
  <a href="#multijogador-online">Multijogador</a> ·
  <a href="public/credits.html">Créditos</a>
</p>

<p align="center">
  <img alt="Licença AGPL v3" src="https://img.shields.io/badge/licen%C3%A7a-AGPL--3.0-d9a952?style=flat-square" />
  <img alt="Node 20.19 ou superior" src="https://img.shields.io/badge/node-%E2%89%A520.19-8f6bff?style=flat-square" />
  <img alt="Feito com Vite e chess.js" src="https://img.shields.io/badge/vite%20%2B%20chess.js-171612?style=flat-square" />
</p>

---

## O que é

Checkmage mantém as regras do xadrez e acrescenta uma camada de caos controlado: **eventos** que mudam o tabuleiro, **cartas** de uso único, **classes** com poderes recarregáveis e **modos de regras** alternativos. As combinações são configuradas antes de cada partida, então a mesma abertura nunca acaba do mesmo jeito.

> Jogue em **[checkmage.onrender.com](https://checkmage.onrender.com)**. O servidor gratuito hiberna quando fica parado, então o primeiro acesso pode levar alguns segundos.

## Destaques

### Modos de regras

| Modo              | Ideia                                                              |
| ----------------- | ------------------------------------------------------------------ |
| **Caos clássico** | Xadrez tradicional com eventos, cartas e classes por cima.         |
| **Roleta Russa**  | A cada turno um tipo de peça é sorteado: só ele pode se mover.     |
| **Evolução**      | As peças evoluem ao longo da partida.                              |
| **Névoa de Guerra** | Cada jogador enxerga apenas o que as próprias peças alcançam.    |

### Eventos

Periodicamente o tabuleiro muda, com aviso prévio:

- **Terremoto**: abismos se abrem no centro e bloqueiam o caminho.
- **Portal dimensional**: pousar em um portal atravessa o tabuleiro.
- **Troca de identidade**: peças marcadas trocam de lugar.
- **Campo minado**: minas ocultas se espalham pelas casas centrais.

### Cartas

Cada jogador começa com uma mão e ganha novas cartas ao capturar peças. Ao todo são onze:

- **Escudo divino**: protege uma peça sua até o início do seu próximo turno.
- **Armadilha**: arma uma casa ao alcance de uma peça sua e, depois de alguns lances do oponente, ela explode. Fica visível para os dois lados.
- **Traição** (3 níveis): converte uma peça inimiga adjacente.
- **Ressurreição** (3 níveis): traz de volta uma peça capturada.
- **Sacrifício**: elimina uma peça sua para ganhar cartas pelo valor dela.
- **Fúria do peão**, **Mudança de cor**, **Salto do elefante**, **Impacto da torre** e **Salto do rei**: movimentos especiais.
- **Contramagia**: resposta do oponente que cancela a carta que acabou de ser jogada.

### Classes

Cada jogador pode escolher uma classe com um poder próprio, que acumula cargas com o passar das rodadas e com capturas:

| Classe          | Poder                                                  |
| --------------- | ------------------------------------------------------ |
| ⚔ **Guerreiro**   | Fúria do peão                                          |
| ✚ **Clérigo**     | Ressurreição                                           |
| ⬡ **Paladino**    | Escudo divino                                          |
| ✧ **Mago**        | Grimório: escolhe uma carta a cada uso (recarga dobrada) |
| † **Bruxo**       | Sacrifício                                             |
| ⌁ **Patrulheiro** | Armadilha                                              |
| ♫ **Bardo**       | Traição                                                |

### Multijogador online

- Crie uma sala, escolha as regras e compartilhe o **código de 6 caracteres** ou o **link direto** (`/room/CODIGO`).
- A **Contramagia** é interativa: quando você joga uma carta e o oponente tem uma, ele decide na hora enquanto o seu tabuleiro fica em espera.
- **Reiniciar** e **sugerir empate** exigem o aceite dos dois lados; **desistir** pede confirmação.
- Se alguém cair no meio da partida, ao voltar para a sala o estado é restaurado.

### Também inclui

- Histórico de lances, capturas, saldo de material e registro de atividades.
- Efeitos sonoros e trilha procedural gerados via Web Audio API.
- Modo local em que uma pessoa controla as Brancas e as Pretas.

## Como executar

Requisitos: **Node.js 20.19 ou superior** e **pnpm 11.25.0** (via Corepack).

```bash
corepack pnpm install --frozen-lockfile
```

**Só o jogo local (desenvolvimento, com recarga automática):**

```bash
pnpm dev
```

**Jogo completo com multijogador** (o servidor serve o build e as salas):

```bash
pnpm build
pnpm start
```

Abra `http://localhost:3000`. Para testar o multijogador, abra a sala em duas abas (uma anônima) ou em dois navegadores.

No Windows também é possível usar `Iniciar Xeque & Caos.cmd`, que restaura as dependências na primeira execução.

### Variáveis de ambiente

| Variável     | Padrão                          | Descrição                                                                           |
| ------------ | ------------------------------- | ----------------------------------------------------------------------------------- |
| `PORT`       | `3000`                          | Porta do servidor.                                                                  |
| `PUBLIC_URL` | derivada da requisição          | Endereço público usado nos links diretos das salas, útil se houver domínio próprio. |

### Publicação

O projeto roda como um serviço Node comum (por exemplo, no Render): instale com `pnpm install --frozen-lockfile`, gere o site com `pnpm build` e inicie com `pnpm start`. As salas ficam na memória do servidor, então elas se perdem se o serviço reiniciar ou hibernar.

## Como o multijogador funciona

O servidor (`server.js`, Express + WebSocket) é a autoridade das **mãos de cartas, cargas dos poderes, contramagia, rodadas, pedidos e fim de jogo**. Os **efeitos de tabuleiro** (armadilhas, escudos, eventos, mortos…) são calculados no cliente de quem jogou e enviados junto do lance; o servidor guarda esse estado e o reenvia, para os dois lados verem sempre a mesma partida. O lado de cada jogador vem da conexão, nunca de dados enviados pelo cliente.

## Estrutura do projeto

```text
├── index.html        Telas de configuração, multijogador e partida
├── server.js         Servidor das salas (Express + ws)
├── src/
│   ├── main.js       Lógica do jogo e interface
│   ├── style.css     Estilos
│   └── assets/       Peças e texturas
├── public/           Logo e página de créditos
└── scripts/          Preparação dos sprites das peças
```

## Desenvolvimento

Stack: HTML, CSS e JavaScript puro, [Vite](https://vite.dev), [chess.js](https://github.com/jhlywa/chess.js), Express e ws.

```bash
pnpm format         # formata o código
pnpm format:check   # confere o padrão
pnpm build          # gera a versão de produção em dist/
```

O projeto foi desenvolvido com assistência de inteligência artificial; as decisões de design e a revisão são de quem mantém o repositório.

## Créditos e licenças

- **Peças:** [Heroes Chess](https://nulltale.itch.io/heroes-chess), por Null Tale, sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Atribuição completa em [`public/credits.html`](public/credits.html) e em `src/assets/`.
- **Regras de xadrez:** [chess.js](https://github.com/jhlywa/chess.js) (BSD 2-Clause).
- **Tipografia:** DM Sans, DM Mono e Space Grotesk, via Google Fonts (SIL OFL).
- **Logo, texturas do tabuleiro e áudio sintetizado:** autorais do projeto.

O código original é distribuído sob a licença [GNU AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html). Assets de terceiros seguem as próprias licenças.
