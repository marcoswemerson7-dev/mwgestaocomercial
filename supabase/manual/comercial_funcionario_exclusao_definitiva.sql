begin;
grant delete on public.comercial_funcionarios to authenticated;
create policy comercial_funcionario_delete_sem_folha on public.comercial_funcionarios as restrictive for delete to authenticated using (
 not exists(select 1 from public.comercial_folhas f cross join lateral jsonb_array_elements(f.detalhes) d where f.estabelecimento_id=comercial_funcionarios.estabelecimento_id and d->>'id'=comercial_funcionarios.id::text)
);
commit;