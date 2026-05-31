-- Connect invoices ↔ finance at the DB layer: a paid invoice always has exactly
-- one linked transaction (issued→income, received→expense); non-paid has none;
-- deleting an invoice removes its transaction. Applied via Supabase MCP.

-- Deleting an invoice should remove its linked transaction (was SET NULL → orphan).
alter table public.transactions drop constraint if exists transactions_invoice_id_fkey;
alter table public.transactions add constraint transactions_invoice_id_fkey
  foreign key (invoice_id) references public.invoices(id) on delete cascade;

create or replace function public.sync_invoice_transaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.status = 'paid') then
    if exists (select 1 from public.transactions where invoice_id = new.id) then
      update public.transactions set
        tenant_id = new.tenant_id,
        type = (case when new.type = 'issued' then 'income' else 'expense' end)::public.transaction_type,
        amount = new.amount,
        currency = new.currency,
        date = new.issue_date,
        description = 'Faktura ' || new.invoice_number || coalesce(' · ' || new.client_name, '')
      where invoice_id = new.id;
    else
      insert into public.transactions (tenant_id, type, amount, currency, date, description, invoice_id, created_by)
      values (new.tenant_id,
              (case when new.type = 'issued' then 'income' else 'expense' end)::public.transaction_type,
              new.amount, new.currency, new.issue_date,
              'Faktura ' || new.invoice_number || coalesce(' · ' || new.client_name, ''),
              new.id, new.created_by);
    end if;
  else
    delete from public.transactions where invoice_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists invoice_transaction_sync on public.invoices;
create trigger invoice_transaction_sync
  after insert or update on public.invoices
  for each row execute function public.sync_invoice_transaction();

-- Backfill paid invoices missing their transaction (idempotent).
insert into public.transactions (tenant_id, type, amount, currency, date, description, invoice_id, created_by)
select i.tenant_id,
       (case when i.type = 'issued' then 'income' else 'expense' end)::public.transaction_type,
       i.amount, i.currency, i.issue_date,
       'Faktura ' || i.invoice_number || coalesce(' · ' || i.client_name, ''),
       i.id, i.created_by
from public.invoices i
where i.status = 'paid'
  and not exists (select 1 from public.transactions t where t.invoice_id = i.id);
