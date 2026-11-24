# Облачная синхронизация

Планер хранит копию данных в вашем проекте Supabase: одна строка таблицы `planer` на пользователя. Читать и менять её может только вошедший владелец.

SQL для создания таблицы (Supabase, раздел SQL Editor):

```sql
create table if not exists public.planer (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  rev bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.planer enable row level security;
create policy "planer: only owner" on public.planer
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.planer to authenticated;
```

Адрес проекта и публичный ключ записываются в `sync-config.js`. В Authentication, URL Configuration, поле Site URL должно быть равно адресу сайта планера.
