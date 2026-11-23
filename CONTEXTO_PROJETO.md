# CONTEXTO DO PROJETO Checkmage

## Visão Geral
Protótipo local de xadrez caótico com mecânicas de cartas, poderes de classe, eventos e modos de jogo. O jogador controla ambos os lados (Brancas e Pretas) no mesmo tabuleiro.

## Arquivos Principais
- `index.html` — Estrutura da interface (telas de setup e jogo)
- `src/main.js` — Lógica completa do jogo (regras, cartas, eventos, classes, áudio, renderização)
- `src/style.css` — Estilização da interface (tema escuro dourado, layout, responsividade)
- `package.json` — Dependências: `chess.js`, `vite`, `prettier`
- `public/credits.html` — Página de créditos e licenças de assets de terceiros

## O que já está implementado e funcionando

### Mecânicas de Xadrez
- Regras padrão via `chess.js` (movimento, roque, promoção, xeque/mate)
- Controle de turnos, mudança de vez entre Brancas/Pretas
- Sistema de captura e registro no histórico

### Eventos de Tabuleiro
- Terremoto (duas casas centrais viram abismos)
- Portal dimensional (peças pousam em portal para outro lado)
- Troca de identidade (peças comuns trocam posição)
- Campo minado (4 minas invisíveis no centro)
- Seleção individual por checkbox na tela de setup

### Modos de Jogo
- **Caos Clássico** — xadrez base com cartas e eventos ativados conforme opções
- **Roleta Russa** — antes de cada lance, roleta exige tipo de peça; sem lance disponível, vez é perdida
- **Evolução** — peça que captura evolui para próxima categoria, até Rainha
- **Névoa de Guerra** — cada jogador vê apenas casas alcançadas por suas peças

### Cartas & Poderes
- Mão inicial de 3 cartas por lado (espelhadas)
- Cartas disponíveis: Traição (níveis 1-3), Escudo, Ressurreição (níveis 1-3), Fúria do Peão, Mudança de Cor, Salto do Elefante, Impacto da Torre, Salto do Rei, Sacrifício, Armadilha/Bomba
- Capturas de peças maiores rendem novas cartas
- Limite de 1 carta por turno (quando ativado)
- Cartas podem ser desativadas/individualmente controladas

### Classes e Poderes de Classe
- 7 classes: Guerreiro, Clérigo, Paladino, Mago, Bruxo, Patrulheiro, Bardo
- Cada classe tem poder com cargas (1-3), recarga por rodadas
- Poderes ativados via hand-panel ou retratos de classe
- Classe Mago: Grimório — escolhe carta por uso; recarga dobrada (10 rodadas no Arcade, 5 no Competitivo)
- Classe Clérigo: Ressurreição — nivelada por cargas (1 carga = nível 1, 2 cargas = nível 2, 3 cargas = nível 3)
- Classe Bardo: Traição — nivelada por cargas
- Classe Guerreiro: Fúria do Peão
- Classe Paladino: Escudo Divino — protege peça por um turno
- Classe Bruxo: Sacrifício — elimina peça própria para ganhar cartas
- Classe Patrulheiro: Armadilha — armina casa dentro do alcance

### Interface do Usuário
- Tela de setup com toggles para eventos, cartas, classes
- Mãos de cartas visíveis (abas por lado) ou poderes de classe
- Painel de capturas e saldo material (`+N / -N` para Brancas/Pretas)
- Banner de turno, badge de xeque, contador de lances
- Indicadores visuais: casas legais, buracos, portais, minas, evento-swap
- Áudio: efeitos sonoros + música procedural Web Audio API
- Botões de toggle som/música, nova partida, voltar setup

### Outros
- Histórico de lances e atividade (cartas usadas, eventos)
- Seletor de promoção visual
- Seletor de ressurreição visual
- Coordenadas de tabuleiro (arquivos e linhas)
- Sprites de peças recortados de sprite sheet Heros Chess (CC BY 4.0, Null Tale)

## O que parece estar incompleto, quebrado ou pela metade

### 1. Modo Competitivo
- O modo competitivo foi parcialmente implementado, mas o usuário solicitou sua remoção
- Precisa remover a seleção entre Arcade e Competitivo da tela de configurações
- Mecânicas competitivas reaproveitadas: mãos visíveis para todos, eventos anunciados desde o início do jogo

### 2. UI de Material
- Palavra "material" deve ser removida e substituída por "duas peças"
- Duas peças divididas por uma barra (tema UI): lado esquerdo peça branca, lado direito peça preta
- Formato: `0= (B) (T) (P) =0` quando material empatado
- Quando material mudar, números mudam: ex: brancas vantagem 5 → `5+ (B) (T) (P) -5`
- Quantidade de cargas de poder dos jogadores deve ser adicionada nessa UI (usando bolinhas dos poderes de cartas)

### 3. Cartas que passam de nível (Flexível)
- Traição e Ressurreição agora gastos de forma flexível
- Nível da carta desce conforme valor da peça usada
- Ex: carta nível 3 gasta em peão (nível 1) → desce para nível 2
- Se carta nível 3 gasta em peça nível 2 → desce para nível 1
- Consumo de cargas para poderes: 3 cargas = nível 3, 2 cargas = nível 2, 1 carga = nível 1
- Usar em peão consome 1 carga (perde 1 nível), cavalo/bispo consome 2 cargas (perde 2 níveis), torre consome 3 cargas (perde todos os níveis)

### 4. Ajustes de Sprite
- Sprites dos bispos dos dois lados estão um pouco maiores → reduzir levemente
- Aumentar levemente o tamanho da rainha branca
- Peões estão grandes → diminuir tamanho
- Peão branco está sem lança no sprite → adicionar lança no recorte (boneco da mesma size do peão preto após diminuição)

### 5. Poder do Mago (Grimório)
- Adicionar opção de cancelar escolha de carta (sem gastar o poder)
- Seleção deve ficar no tabuleiro, em vez de meio da tela tapando tudo
- Se jogador clicar fora da seleção, ela é cancelada (sem gastar o poder)

### 6. Retratos de Classe na UI
- Dentro da caixa do bater (fora do tabuleiro, obviamente):
  - Esquerda em baixo: retrato do jogador
  - Direita em cima: retrato do adversário
- Imagem baseada na classe do jogador (assets quadrados "foto de perfil" nas molduras)
- Ilustração diferente para cada classe (precisa criar ou achar assets grátis, licença permissiva)
- Por cima das ilustrações: UI minimalista, pequena, fundo semi-transparente, ocupando menor espaço possível
- Não deve espremer ilustrações quando tabuleiro aumenta (F11)
- Clicar na ilustração ativa o poder (igual clicar no botão de carta) — segunda opção da UI para conveniência

## Estrutura Atual dos Arquivos

### index.html
- Tela de `setup-screen` com seleção de eventos, cartas, classes, modos
- Tela de `game-screen` com tabuleiro, hands-panel, sidebar, capture-stats, material-balance
- Elementos chave: `#board`, `#turn-banner`, `#card-selection`, `#class-portrait`, `#grimoire-picker`, `#class-draft`
- Footer com modo label e créditos

### src/main.js
- Lógica completa em um único arquivo (~2400 linhas)
- Funções principais: `newGame()`, `beginMatch()`, `render()`, `onSquare()`, `selectPiece()`, `useClassPower()`, `spendClassPower()`, `reduceClassCooldown()`, `settleClassCharge()`
- Sistema de cartas: `useCard()`, `cardTarget()`, hasInitialCardTarget, hasCheckMate
- Sistema de classes: `classPower`, `classPower` charges/cooldown, `tickClassRounds()`, `spendClassPower()`
- Áudio: `playSound()`, `startAmbient()`, `stopAmbient()`
- Renderização: `renderBoard()`, `renderCaptureStats()`, `renderHand()`, `renderEvent()`, `renderResurrectionChoices()`

### src/style.css
- Variáveis CSS com tema escuro/dourado
- Estilos para tabuleiro, peças, sprites, hover/seleção
- Responsividade para mobile (media queries em vários breakpoints)
- Animações de pulse, swap, bomb, fadein

### Assets
- Sprites recortados de `Heroes3_Pieces.png` por Null Tale (CC BY 4.0)
- JSON de crops: `heroes-sprite-crops.json`
- PNGs individuais em `src/assets/pieces/` (12 peças: w-p, w-n, w-b, w-r, w-q, w-k, b-p, b-n, b-b, b-r, b-q, b-k)
- SVG do tabuleiro: `fantasy-tile-light.svg`, `fantasy-tile-dark.svg`
- Classe sprites ainda não implementados (import glob em main.js mas ainda não renderizados na UI)

### patch-notes (documentação interna)
- `AI_HANDOFF.md` — handoff técnico para futuras sessões
- `DEVELOPMENT_PATCH_02.md` — conclusão do TODO principal
- `IMPLEMENTATION_PLAN.md` — plano reorganizado dos itens do TODO.txt
- `IN_PROGRESS.md` — status do desenvolvimento
- `README.md` — documentação de usuário

## Próximos Passos Sugeridos

Based on the user's 6 main requests, the priority should be:

1. **Remover modo competitivo** e reutilizar suas mecânicas (mãos visíveis, eventos anunciados desde início)
2. **Redesign da UI de material** — remover "material", adicionar duas peças com barra e cargas
3. **Implementar nível flexível de cartas** — Treason/Resurrection level reduction logic
4. **Ajustes de sprite** — tamanho de bispos, rainha, peões; adicionar lança ao peão branco
5. **Cancelar seleção no Grimório** — sem gastar poder, clicar fora cancela
6. **Retratos de classe na UI** — adicionar ilustrações, UI minimalista sobre elas

---

Próximo passo: Qual é o próximo passo antes de alterar o código? O usuário deve me dizer qual item começar a trabalhar ou se há alguma preferência sobre a ordem.