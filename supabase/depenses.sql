  -- Table des dépenses
  create table if not exists public.depenses (
    id          uuid primary key default gen_random_uuid(),
    date        date not null,
    categorie   text not null,
    description text not null,
    montant     integer not null check (montant > 0),
    mode        text not null default 'Espèces',
    created_at  timestamptz default now()
  );

  -- Index pour les requêtes par date
  create index if not exists depenses_date_idx on public.depenses (date desc);

  -- RLS
  alter table public.depenses enable row level security;

  create policy "Admins peuvent tout faire sur depenses"
    on public.depenses
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'admin2')
      )
    )
    with check (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('admin', 'admin2')
      )
    );
