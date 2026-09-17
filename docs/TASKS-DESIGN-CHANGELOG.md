# Task UI visual baseline

## 2026-09-17 — perceptible Cilo workspace redesign

This revision keeps the existing task/dependency/delivery logic, but changes the composition visibly:

- neutral workspace background around white operational cards;
- glass drawer shell and glass context panel;
- explicit execution hero with state icon;
- clear “Execução da tarefa / O que precisa ser feito” hierarchy;
- consolidated right-side context card instead of several small property cards;
- briefing, received materials, delivery and completion as the main execution sequence;
- advanced dependency flow remains hidden behind “Ver fluxo”;
- task settings remain hidden behind “Configurações da tarefa”.

Do not add another visual override layer for task UI. Future visual changes must update `task-design-v9-cilo-glass.css` or the official design system tokens.
