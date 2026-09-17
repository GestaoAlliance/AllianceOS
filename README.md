# AllianceOS

Sistema operacional interno da **Alliance** para centralizar a gestão das empresas administradas pelo grupo.

Empresas configuradas de fábrica:

- **Botanika**
- **Revita**
- **VermeFree**
- **Shoty**

O sistema reúne planejamento, campanhas, tarefas, entregas, conferência, rotina da equipe, painéis, agenda, arquivos e administração de acessos em um único ambiente.

## Botanika: fonte operacional

Para a Botanika, a **Shopify é a fonte principal de dados operacionais**. Não usamos Bling nesta arquitetura.

O data hub nativo do AllianceOS foi preparado para sincronizar da Shopify:

- pedidos, itens, pagamentos, descontos e reembolsos;
- estoque por localização e estados de inventário (`available`, `on_hand`, `committed`, `incoming`, `reserved`, `damaged`, `safety_stock` e `quality_control`);
- fila de expedição (`fulfillmentOrders`) e itens ainda pendentes;
- remessas (`fulfillments`), status, local de expedição e quantidades;
- transportadora, código e URL de rastreio;
- eventos de transporte, trânsito, previsão e entrega;
- método/frete e região de destino, sem persistir nome, telefone ou endereço de rua do cliente nas tabelas analíticas.

Meta Ads e Instagram permanecem como fontes de marketing separadas. Segredos da Shopify/Meta/Instagram ficam apenas no servidor e nunca devem ser enviados para o navegador ou versionados no GitHub.

## Deploy

O repositório raiz é o projeto atualmente ligado à Vercel. O build de compatibilidade traz o frontend legado durante o deploy, enquanto as novas APIs server-side vivem em `api/` e as migrations do novo data hub em `supabase/migrations/`.

Algumas chaves internas ainda usam o prefixo legado `central.*` / `central_*` de propósito. Elas foram mantidas para não quebrar dados já persistidos nem integrações existentes. Isso é implementação interna; a identidade do produto é **AllianceOS**.
