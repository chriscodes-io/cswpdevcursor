-- Capacity Ops — leads + audits schema
-- Run in Supabase SQL Editor or via CLI

create extension if not exists "pgcrypto";

create type lead_status as enum ('new', 'contacted', 'converted', 'archived');

create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  website_url text not null,
  overall_score int not null check (overall_score between 0 and 100),
  performance int not null check (performance between 0 and 100),
  seo int not null check (seo between 0 and 100),
  security int not null check (security between 0 and 100),
  technical int not null check (technical between 0 and 100),
  accessibility int not null check (accessibility between 0 and 100),
  issues_json jsonb not null default '{}'::jsonb,
  pdf_url text,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  email varchar(320) not null,
  website_url varchar(2048) not null,
  audit_id uuid references audits(id) on delete set null,
  project_name varchar(255),
  created_at timestamptz not null default now(),
  last_contacted timestamptz,
  status lead_status not null default 'new',
  unique (email, website_url)
);

create index if not exists idx_leads_created_at on leads (created_at desc);
create index if not exists idx_audits_share_token on audits (share_token);
create index if not exists idx_audits_created_at on audits (created_at desc);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists audits_updated_at on audits;
create trigger audits_updated_at
  before update on audits
  for each row execute function set_updated_at();
