# AllianceOS — Design System da área de Tarefas

## Princípio
A área de tarefas deve seguir a linguagem visual Cilo/AllianceOS já existente no produto. A experiência é operacional, densa mas calma, com superfícies neutras, bordas finas, tipografia clara, controles compactos e disclosure progressivo.

## Fonte de verdade visual
Usar sempre os tokens `--ds-*` definidos pelo design system global (`cilo-design-v5.css`). Não criar paletas, raios, sombras ou escalas paralelas dentro do módulo de tarefas.

## Estrutura da ficha
A ficha tem três níveis de informação:

1. **Execução imediata** — briefing, materiais recebidos, entrega e concluir.
2. **Contexto** — responsável, prazo, prioridade e campanha.
3. **Avançado** — árvore do fluxo, dependências, recorrência, colaboradores e regras.

O colaborador nunca precisa entender o motor de dependências para executar uma tarefa.

## Hierarquia
- Cabeçalho: breadcrumb pequeno + título + ação principal.
- Coluna principal: conteúdo de execução.
- Painel lateral: resumo contextual e detalhes recolhidos.
- Fluxo completo: recolhido por padrão em `Ver fluxo`.

## Liquid Glass
O efeito glass é um acento de interface, não a superfície padrão.

Aplicar apenas em:
- shell do drawer;
- cabeçalho do drawer;
- cards de contexto da sidebar;
- controles flutuantes/contextuais.

Não aplicar blur em todos os cards de conteúdo. Briefing, entrega, comentários e anexos devem permanecer em superfícies sólidas para preservar leitura.

## Componentes
### Drawer
- raio: `--ds-radius-xl`;
- fundo baseado em `--ds-surface` com transparência e `backdrop-filter`;
- borda: `--ds-line` / `--ds-line-strong`;
- sombra discreta baseada no sistema.

### Cards
- raio padrão: `--ds-radius-md`;
- borda de 1px;
- sem sombra pesada;
- espaçamento interno compacto.

### Inputs / selects
- altura padrão: 40px;
- raio: `--ds-radius-sm`;
- borda: `--ds-line-strong`;
- foco discreto e neutro.

### Botão principal
- altura: 40px;
- fundo `--ds-black`;
- texto branco (invertido no dark mode quando necessário);
- sem gradientes.

### Tipografia
- título da ficha: 22px;
- título de card: 12px;
- corpo operacional: 10.5–12.5px;
- texto auxiliar: 8.5–10px;

## Regras funcionais refletidas no design
- tarefa bloqueada: aviso curto e claro; detalhes do fluxo só sob demanda;
- entrega obrigatória: `Enviar e concluir` vira a ação principal;
- material recebido: aparece próximo ao briefing, não escondido no histórico;
- tarefas vinculadas: continuam aparecendo como tarefas normais em Lista, Quadro e Semana;
- árvore: comunica relação de fluxo, mas nunca substitui a tarefa individual.

## Responsividade
- desktop: principal + sidebar;
- tablet: sidebar reduzida;
- mobile: coluna única, drawer em tela cheia, ações em largura total.

## Dark mode
O dark mode inverte os tokens do mesmo sistema. Não criar uma estética separada. Glass em dark usa superfícies translúcidas baseadas em `--ds-surface` e bordas `--ds-line`.

## Anti-drift
Evitar novos arquivos de hotfix visual (`v10`, `v11`, etc.). Mudanças visuais futuras devem entrar na camada única final de tarefas e continuar referenciando `--ds-*`.
