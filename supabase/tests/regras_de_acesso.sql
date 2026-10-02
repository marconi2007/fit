-- Testes das regras de acesso e das funções do banco.
-- Rodar com: npm run test:db   (ver scripts/testar-banco.sh)
\set ON_ERROR_STOP 1
\set QUIET 1

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FALHOU: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- Executa um comando que precisa dar erro (como o papel atual).
create function pg_temp.falha(cmd text, msg text) returns void language plpgsql as $$
begin
  begin
    execute cmd;
  exception when others then
    raise notice 'ok - % (erro: %)', msg, sqlerrm;
    return;
  end;
  raise exception 'FALHOU: % (deveria ter dado erro)', msg;
end $$;

create function pg_temp.como(usuario uuid) returns void language plpgsql as $$
begin
  perform set_config('role', case when usuario is null then 'anon' else 'authenticated' end, false);
  perform set_config('request.jwt.claim.sub', coalesce(usuario::text, ''), false);
end $$;

create function pg_temp.admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- Ids fixos para os testes
\set p1 '''11111111-1111-1111-1111-111111111111'''
\set p2 '''22222222-2222-2222-2222-222222222222'''
\set u_ana '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set u_bia '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''

-- ---------------------------------------------------------------- contas
set role supabase_auth_admin;
insert into auth.users (id, email, raw_user_meta_data) values
  (:p1, 'marconi@exemplo.com', '{"tipo":"professor","nome":"Marconi"}'),
  (:p2, 'outra@exemplo.com', '{"tipo":"professor","nome":"Outra Professora"}');
reset role;
select pg_temp.ok((select count(*) = 2 from public.professores), 'criar conta de professor cria o cadastro');
select pg_temp.ok((select count(*) >= 30 from public.exercicios where professor_id is null), 'biblioteca padrão carregada');

-- ---------------------------------------------------------------- alunos
select pg_temp.como(:p1);
insert into public.alunos (nome, objetivo, restricoes) values ('Ana Souza', 'Hipertrofia', 'Dor no joelho direito');
insert into public.alunos (nome, objetivo) values ('Bruno Lima', 'Emagrecimento');
select pg_temp.ok((select count(*) = 2 from public.alunos), 'professor vê os próprios alunos');
select pg_temp.ok((select professor_id = :p1 from public.alunos where nome = 'Ana Souza'), 'professor_id preenchido sozinho');
select id as ana_id from public.alunos where nome = 'Ana Souza' \gset

select pg_temp.como(:p2);
select pg_temp.ok((select count(*) = 0 from public.alunos), 'outra professora não vê os alunos de Marconi');
insert into public.alunos (nome) values ('Carla da Outra');
select pg_temp.falha(format('insert into public.alunos (professor_id, nome) values (%L, %L)', :p1, 'Intruso'),
  'não dá para criar aluno em nome de outro professor');
update public.alunos set nome = 'hack' where nome = 'Ana Souza';
select pg_temp.admin();
select pg_temp.ok((select count(*) = 1 from public.alunos where nome = 'Ana Souza'), 'outra professora não altera aluno de Marconi');

-- ---------------------------------------------------------------- exercício próprio
select pg_temp.como(:p1);
insert into public.exercicios (professor_id, nome, grupo_muscular, equipamento)
  values (:p1, 'Hip thrust na máquina', 'Pernas', 'Máquina');
select pg_temp.como(:p2);
select pg_temp.ok((select count(*) = 0 from public.exercicios where nome = 'Hip thrust na máquina'), 'exercício próprio não aparece para outro professor');
update public.exercicios set nome = 'x' where professor_id is null;
select pg_temp.admin();
select pg_temp.ok((select count(*) = 0 from public.exercicios where nome = 'x'), 'professor não edita a biblioteca padrão');

-- ---------------------------------------------------------------- ficha
select pg_temp.como(:p1);
select public.salvar_ficha(jsonb_build_object(
  'id', '33333333-3333-3333-3333-333333333333',
  'aluno_id', (select id from public.alunos where nome = 'Ana Souza'),
  'nome', 'Hipertrofia ABC', 'data_inicio', '2026-10-01', 'validade', '2026-11-12',
  'divisoes', jsonb_build_array(
    jsonb_build_object('id', '44444444-4444-4444-4444-44444444444a', 'nome', 'A', 'foco', 'Peito e tríceps', 'itens', jsonb_build_array(
      jsonb_build_object('id', '55555555-5555-5555-5555-55555555555a', 'exercicio_id', (select id from public.exercicios where nome = 'Supino reto com barra'), 'series', 4, 'repeticoes', '8-10', 'carga_kg', 40, 'descanso_seg', 90, 'observacao', 'Sem quicar a barra'),
      jsonb_build_object('id', '55555555-5555-5555-5555-55555555555b', 'exercicio_id', (select id from public.exercicios where nome = 'Tríceps na polia'), 'series', 3, 'repeticoes', '12', 'carga_kg', 25))),
    jsonb_build_object('id', '44444444-4444-4444-4444-44444444444b', 'nome', 'B', 'foco', 'Pernas', 'itens', jsonb_build_array(
      jsonb_build_object('id', '55555555-5555-5555-5555-55555555555c', 'exercicio_id', (select id from public.exercicios where nome = 'Hip thrust na máquina'), 'series', 3, 'repeticoes', '12', 'carga_kg', 60)))
  )));
select pg_temp.ok((select count(*) = 3 from public.itens_treino), 'ficha salva com 2 divisões e 3 itens');
select pg_temp.ok((select ativa from public.fichas where id = '33333333-3333-3333-3333-333333333333'), 'ficha do aluno fica ativa');

-- editar: remove um item, mantém ids dos outros
select public.salvar_ficha(jsonb_build_object(
  'id', '33333333-3333-3333-3333-333333333333',
  'aluno_id', (select id from public.alunos where nome = 'Ana Souza'),
  'nome', 'Hipertrofia AB', 'validade', '2026-11-12',
  'divisoes', jsonb_build_array(
    jsonb_build_object('id', '44444444-4444-4444-4444-44444444444a', 'nome', 'A', 'foco', 'Peito e tríceps', 'itens', jsonb_build_array(
      jsonb_build_object('id', '55555555-5555-5555-5555-55555555555a', 'exercicio_id', (select id from public.exercicios where nome = 'Supino reto com barra'), 'series', 4, 'repeticoes', '8-10', 'carga_kg', 42.5, 'descanso_seg', 90))),
    jsonb_build_object('id', '44444444-4444-4444-4444-44444444444b', 'nome', 'B', 'foco', 'Pernas', 'itens', jsonb_build_array(
      jsonb_build_object('id', '55555555-5555-5555-5555-55555555555c', 'exercicio_id', (select id from public.exercicios where nome = 'Hip thrust na máquina'), 'series', 3, 'repeticoes', '12', 'carga_kg', 60)))
  )));
select pg_temp.ok((select count(*) = 2 from public.itens_treino), 'editar ficha remove o item tirado');
select pg_temp.ok((select carga_kg = 42.5 from public.itens_treino where id = '55555555-5555-5555-5555-55555555555a'), 'editar ficha atualiza a carga mantendo o id');

-- modelo
select public.salvar_ficha(jsonb_build_object('eh_modelo', true, 'nome', 'Modelo full body', 'divisoes', jsonb_build_array(
  jsonb_build_object('nome', 'A', 'itens', jsonb_build_array(jsonb_build_object('exercicio_id', (select id from public.exercicios where nome = 'Prancha'), 'repeticoes', '30 s'))))));
select pg_temp.ok((select count(*) = 1 from public.fichas where eh_modelo and aluno_id is null and not ativa), 'modelo salvo sem aluno e inativo');

select pg_temp.como(:p2);
select pg_temp.ok((select count(*) = 0 from public.fichas), 'outra professora não vê fichas de Marconi');
select pg_temp.ok((select count(*) = 0 from public.itens_treino), 'outra professora não vê itens de Marconi');
select pg_temp.falha($$select public.salvar_ficha(jsonb_build_object('id', '33333333-3333-3333-3333-333333333333', 'aluno_id', (select id from public.alunos limit 1), 'nome', 'Roubo'))$$,
  'outra professora não sobrescreve ficha de Marconi');
select pg_temp.falha(format($$select public.salvar_ficha(jsonb_build_object('aluno_id', %L, 'nome', 'X'))$$, :'ana_id'),
  'ficha para aluno de outro professor é recusada');
select pg_temp.falha(format($$select public.gerar_convite(%L)$$, :'ana_id'), 'convite para aluno de outro professor é recusado');

-- ---------------------------------------------------------------- convite
select pg_temp.como(:p1);
select public.gerar_convite((select id from public.alunos where nome = 'Ana Souza')) as codigo \gset
select pg_temp.ok(length(:'codigo') = 8, 'convite gerado com 8 caracteres');

select pg_temp.como(null);
select pg_temp.ok((select count(*) = 0 from public.alunos), 'visitante não lê alunos');
select pg_temp.ok((select aluno_nome = 'Ana Souza' and professor_nome = 'Marconi' from public.validar_convite(lower(:'codigo'))), 'visitante valida o convite pelo código');
select pg_temp.ok((select count(*) = 0 from public.validar_convite('NAOEXISTE')), 'código errado não valida');
select pg_temp.falha('select public.salvar_ficha($${}$$::jsonb)', 'visitante não chama funções de professor');

-- aluna cria a conta com o código
select pg_temp.admin();
set role supabase_auth_admin;
insert into auth.users (id, email, raw_user_meta_data) values
  (:u_ana, 'ana@exemplo.com', jsonb_build_object('codigo_convite', :'codigo'));
reset role;
select pg_temp.ok((select usuario_id = :u_ana and termos_aceitos_em is not null from public.alunos where nome = 'Ana Souza'), 'conta da aluna ligada ao cadastro');
select pg_temp.ok((select usado_em is not null from public.convites where codigo = :'codigo'), 'convite marcado como usado');
select pg_temp.ok((select count(*) = 0 from public.validar_convite(:'codigo')), 'convite usado não vale de novo');

-- convite usado não liga outra conta
select pg_temp.falha(format($$insert into auth.users (id, email, raw_user_meta_data) values (%L, 'bia@exemplo.com', '{"codigo_convite":"%s"}')$$, :u_bia, :'codigo'),
  'convite usado não cria segunda conta de aluno');

-- ---------------------------------------------------------------- visão da aluna
select pg_temp.como(:u_ana);
select pg_temp.ok((select count(*) = 1 from public.alunos), 'aluna vê só o próprio cadastro');
select pg_temp.ok((select count(*) = 1 from public.fichas), 'aluna vê só a ficha ativa (não o modelo)');
select pg_temp.ok((select count(*) = 2 from public.divisoes), 'aluna vê as divisões da ficha');
select pg_temp.ok((select count(*) = 2 from public.itens_treino), 'aluna vê os itens da ficha');
select pg_temp.ok((select count(*) = 1 from public.exercicios where nome = 'Hip thrust na máquina'), 'aluna vê o exercício próprio do professor');
select pg_temp.ok((select nome = 'Marconi' from public.professores), 'aluna vê o nome do professor');
update public.fichas set nome = 'hack';
update public.alunos set status = 'arquivado';
select pg_temp.falha($$insert into public.sessoes (professor_id, aluno_id, divisao_nome, iniciada_em, finalizada_em) select professor_id, id, 'A', now(), now() from public.alunos$$,
  'aluna não grava sessão direto na tabela');

select public.registrar_sessao(jsonb_build_object(
  'divisao_id', '44444444-4444-4444-4444-44444444444a',
  'iniciada_em', '2026-10-02T10:00:00Z', 'finalizada_em', '2026-10-02T10:52:00Z',
  'esforco', 'dificil', 'comentario', 'Supino pesado hoje',
  'series', jsonb_build_array(
    jsonb_build_object('item_treino_id', '55555555-5555-5555-5555-55555555555a', 'numero', 1, 'repeticoes_feitas', '10', 'carga_kg', 42.5),
    jsonb_build_object('item_treino_id', '55555555-5555-5555-5555-55555555555a', 'numero', 2, 'repeticoes_feitas', '8', 'carga_kg', 42.5))
)) as sessao \gset
select pg_temp.ok((select count(*) = 2 from public.series_realizadas), 'aluna registra a sessão com as séries');
select pg_temp.ok((select exercicio_id = (select id from public.exercicios where nome = 'Supino reto com barra') from public.series_realizadas limit 1), 'série guarda o exercício vindo da ficha');
select pg_temp.falha($$select public.registrar_sessao(jsonb_build_object('divisao_id', '44444444-4444-4444-4444-44444444444a', 'series', jsonb_build_array(jsonb_build_object('item_treino_id', '55555555-5555-5555-5555-55555555555c', 'numero', 1))))$$,
  'série de item de outra divisão é recusada');
select pg_temp.falha('select public.gerar_convite((select id from public.alunos))', 'aluna não gera convites');
select public.atualizar_meu_perfil('Ana S. Souza', '(11) 98888-0000');

select pg_temp.admin();
select pg_temp.ok((select nome = 'Hipertrofia AB' from public.fichas where id = '33333333-3333-3333-3333-333333333333'), 'aluna não altera a ficha');
select pg_temp.ok((select status = 'ativo' and nome = 'Ana S. Souza' from public.alunos where usuario_id = :u_ana), 'aluna não muda o próprio status, mas edita nome');

-- ---------------------------------------------------------------- professor vê o treino
select pg_temp.como(:p1);
select pg_temp.ok((select count(*) = 1 and bool_and(divisao_nome = 'A') from public.sessoes), 'professor vê o treino da aluna');
select pg_temp.ok((select count(*) = 2 from public.series_realizadas), 'professor vê as séries da aluna');
update public.series_realizadas set carga_kg = 999;
select pg_temp.ok((select count(*) = 0 from public.series_realizadas where carga_kg = 999), 'professor não altera o que a aluna registrou');
select pg_temp.como(:p2);
select pg_temp.ok((select count(*) = 0 from public.sessoes), 'outra professora não vê o treino');

-- nova ficha desativa a anterior; histórico continua
select pg_temp.como(:p1);
select public.salvar_ficha(jsonb_build_object(
  'aluno_id', (select id from public.alunos where nome = 'Ana S. Souza'), 'nome', 'Nova ficha',
  'criada_a_partir_de', '33333333-3333-3333-3333-333333333333',
  'divisoes', jsonb_build_array(jsonb_build_object('nome', 'A', 'itens', '[]'::jsonb))));
select pg_temp.ok((select count(*) = 1 from public.fichas where ativa), 'só uma ficha ativa por aluno');
select pg_temp.como(:u_ana);
select pg_temp.ok((select nome = 'Nova ficha' from public.fichas), 'aluna passa a ver só a ficha nova');
select pg_temp.ok((select count(*) = 1 from public.sessoes), 'histórico da aluna continua depois da troca de ficha');

-- arquivar tira o acesso
select pg_temp.como(:p1);
update public.alunos set status = 'arquivado' where usuario_id = :u_ana;
select pg_temp.como(:u_ana);
select pg_temp.ok((select count(*) = 0 from public.fichas), 'aluna arquivada perde acesso à ficha');
select pg_temp.ok((select count(*) = 0 from public.sessoes), 'aluna arquivada perde acesso ao histórico');
select pg_temp.como(:p1);
select pg_temp.ok((select count(*) = 1 from public.sessoes), 'professor mantém o histórico da aluna arquivada');
select pg_temp.admin();
\echo 'Todos os testes passaram.'
