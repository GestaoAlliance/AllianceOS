-- Estados nativos de inventário da Shopify usados por operação/expedição.
alter table public.shopify_inventory add column if not exists on_hand integer not null default 0;
alter table public.shopify_inventory add column if not exists committed integer not null default 0;
alter table public.shopify_inventory add column if not exists incoming integer not null default 0;
alter table public.shopify_inventory add column if not exists reserved integer not null default 0;
alter table public.shopify_inventory add column if not exists damaged integer not null default 0;
alter table public.shopify_inventory add column if not exists safety_stock integer not null default 0;
alter table public.shopify_inventory add column if not exists quality_control integer not null default 0;

create index if not exists shopify_inventory_committed_idx on public.shopify_inventory (brand_id, committed desc);
create index if not exists shopify_inventory_incoming_idx on public.shopify_inventory (brand_id, incoming desc);
