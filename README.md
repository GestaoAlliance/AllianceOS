# AllianceOS

Sistema operacional interno da **Alliance** para centralizar a gestão das empresas administradas pelo grupo.

Empresas configuradas de fábrica:

- **Botanika**
- **Revita**
- **VermeFree**
- **Shoty**

O sistema reúne planejamento, campanhas, tarefas, entregas, conferência, rotina da equipe, painéis, agenda, arquivos e administração de acessos em um único ambiente.

## Aplicação em produção

A aplicação atual está em [`operacional/`](./operacional).

```bash
cd operacional
npm install
npm run build
```

O build gera `operacional/dist/index.html`.

## Deploy na Vercel

Use:

- **Root Directory:** `operacional`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

As funções serverless ficam em `operacional/api/`.

## Banco e integrações

Os scripts de banco ficam em `operacional/banco/`. O arquivo `marcas.sql` garante o cadastro-base das quatro empresas do AllianceOS e também migra o antigo cadastro `Revitta Derma` para `Revita`.

Algumas chaves internas e nomes de funções SQL ainda usam o prefixo legado `central.*` / `central_*` de propósito. Eles foram mantidos para não quebrar dados já persistidos nem integrações existentes. Isso é implementação interna; a identidade do produto é **AllianceOS**.
