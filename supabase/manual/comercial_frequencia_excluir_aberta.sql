begin;
grant delete on public.comercial_frequencia to authenticated;
create policy comercial_frequencia_delete_aberta on public.comercial_frequencia as restrictive for delete to authenticated using (
 not exists(select 1 from public.comercial_folhas f where f.estabelecimento_id=comercial_frequencia.estabelecimento_id and f.competencia=date_trunc('month',comercial_frequencia.data::timestamp)::date)
);
commit;