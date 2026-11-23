# Checkmage

Protótipo local de xadrez dinâmico. No Modo treino, uma pessoa controla as Brancas e as Pretas. Eventos, cartas e regras alternativas podem ser combinados para cada partida.

## Executar

Requisitos para desenvolvimento: Node.js 20.19 ou superior e pnpm 11.25.0. No Windows, abra `Iniciar Xeque & Caos.cmd`; o inicializador usa o Node portátil local quando disponível, aceita o Node do sistema e restaura as dependências na primeira execução. Também é possível iniciar pelo terminal:

```powershell
corepack pnpm install --frozen-lockfile
pnpm dev
```

Versões e dependências estão em `package.json` e `pnpm-lock.yaml`. A lógica e a interface ficam em `src/`; a tela de configuração está em `index.html`.

## Estado atual

- Regras padrão de xadrez via `chess.js`, interação local, captura, roque, promoção e condição de fim de partida.
- Modos de regras disponíveis: Caos clássico, Roleta Russa, Evolução e Névoa de Guerra. No modo local, o jogador controla os dois lados.
- Eventos disponíveis: Terremoto, Portal Dimensional, Troca de Identidade e Campo Minado. É possível desativar eventos ou selecionar os eventos usados.
- Cartas disponíveis incluem Traição evolutiva, Escudo, Ressurreição evolutiva, Fúria do Peão, Mudança de Cor, Salto do Elefante, Impacto da Torre, Salto do Rei, Sacrifício e Armadilha.
- O protótipo mostra capturas, saldo de material, histórico de lances, cartas e eventos. A interface inclui efeitos sonoros e música procedural; durante a partida a trilha alterna camadas melódicas. Cartas e classes podem ser ativadas separadamente, com seleção manual ou aleatória das classes.
- No modo Competitivo, cada lado começa com duas cartas idênticas; recompensas por captura continuam aleatórias. As classes começam com uma carga, recarregam em 5 rodadas no Arcade (10 para o Mago) e o dobro no Competitivo, podendo ser usadas sempre que houver ao menos uma carga.
- Créditos e transparência: `/credits.html`. O modo local permite controlar os dois lados. Multiplayer e salas online são planos futuros.

## Ativos

- Sprites pixel art de Heroes Chess, por Null Tale, sob CC BY 4.0. Fonte e atribuição em `src/assets/HEROES_CHESS_LICENSE.txt` e na página de créditos.
- Texturas do tabuleiro são assets SVG do projeto, feitos para combinar com as peças.
- `scripts/prepare-heroes-sprites.mjs` regenera os 12 PNGs transparentes isolados a partir do sprite sheet original; o jogo carrega os arquivos individuais em `src/assets/pieces/`.

## Desenvolvimento

O desenvolvimento usa HTML, CSS, JavaScript e Vite. Os scripts de execução, build e formatação estão listados em `package.json`.

Use `pnpm format` para formatar o código e `pnpm format:check` para conferir o padrão. `pnpm build` gera a versão de produção em `dist/`.

## Licença

O código original é distribuído sob a licença GNU AGPLv3 (Affero General Public License v3). Assets de terceiros seguem suas próprias licenças e atribuições, documentadas em `/credits.html` e em `src/assets/`.
