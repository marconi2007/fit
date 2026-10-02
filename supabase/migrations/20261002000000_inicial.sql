-- App Academia: esquema inicial (professores, alunos, convites, exercícios,
-- fichas, divisões, itens de treino, sessões e séries realizadas).
--
-- Regra central: todo dado de aluno pertence a um professor, e as regras de
-- acesso (Row Level Security) garantem que um professor só vê os próprios
-- alunos e que o aluno só vê a própria ficha ativa e o próprio histórico.

-- =====================================================================
-- Tabelas
-- =====================================================================

create table public.professores (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text,
  telefone text,
  foto_url text,
  criado_em timestamptz not null default now()
);

create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references public.professores (id) on delete cascade,
  usuario_id uuid unique references auth.users (id) on delete set null,
  nome text not null check (length(trim(nome)) > 0),
  email text,
  telefone text,
  data_nascimento date,
  objetivo text,
  restricoes text,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  termos_aceitos_em timestamptz,
  criado_em timestamptz not null default now()
);
create index alunos_professor_idx on public.alunos (professor_id);

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references public.professores (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  codigo text not null unique,
  expira_em timestamptz not null default now() + interval '7 days',
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index convites_aluno_idx on public.convites (aluno_id);

-- professor_id vazio = biblioteca padrão, compartilhada por todos.
create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid references public.professores (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  grupo_muscular text not null,
  equipamento text,
  youtube_url text,
  criado_em timestamptz not null default now()
);
create index exercicios_professor_idx on public.exercicios (professor_id);

-- aluno_id vazio = modelo reutilizável. No máximo uma ficha ativa por aluno.
create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null default auth.uid() references public.professores (id) on delete cascade,
  aluno_id uuid references public.alunos (id) on delete cascade,
  nome text not null,
  data_inicio date,
  validade date,
  ativa boolean not null default false,
  eh_modelo boolean not null default false,
  criada_a_partir_de uuid references public.fichas (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check ((eh_modelo and aluno_id is null and not ativa) or (not eh_modelo and aluno_id is not null))
);
create unique index fichas_uma_ativa_por_aluno on public.fichas (aluno_id) where ativa;
create index fichas_professor_idx on public.fichas (professor_id);

create table public.divisoes (
  id uuid primary key default gen_random_uuid(),
  ficha_id uuid not null references public.fichas (id) on delete cascade,
  nome text not null,
  foco text,
  ordem int not null default 0
);
create index divisoes_ficha_idx on public.divisoes (ficha_id);

create table public.itens_treino (
  id uuid primary key default gen_random_uuid(),
  divisao_id uuid not null references public.divisoes (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id),
  ordem int not null default 0,
  series int not null default 3 check (series between 1 and 20),
  repeticoes text not null default '10',
  carga_kg numeric(6, 2),
  descanso_seg int check (descanso_seg is null or descanso_seg between 0 and 3600),
  observacao text
);
create index itens_divisao_idx on public.itens_treino (divisao_id);

-- divisao_nome e divisao_foco guardam como era o treino no dia, para o
-- histórico continuar legível mesmo se a ficha for editada ou trocada.
create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  professor_id uuid not null references public.professores (id) on delete cascade,
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  divisao_id uuid references public.divisoes (id) on delete set null,
  divisao_nome text not null,
  divisao_foco text,
  iniciada_em timestamptz not null,
  finalizada_em timestamptz not null,
  esforco text check (esforco in ('facil', 'ok', 'dificil')),
  comentario text,
  criado_em timestamptz not null default now()
);
create index sessoes_professor_idx on public.sessoes (professor_id, finalizada_em desc);
create index sessoes_aluno_idx on public.sessoes (aluno_id, finalizada_em desc);

create table public.series_realizadas (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes (id) on delete cascade,
  item_treino_id uuid references public.itens_treino (id) on delete set null,
  exercicio_id uuid not null references public.exercicios (id),
  numero int not null,
  repeticoes_feitas text,
  carga_kg numeric(6, 2),
  feita boolean not null default true
);
create index series_sessao_idx on public.series_realizadas (sessao_id);

-- =====================================================================
-- Funções auxiliares usadas pelas regras de acesso
-- (security definer para não cair em recursão entre políticas)
-- =====================================================================

create function public.meu_aluno_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.alunos where usuario_id = auth.uid() and status = 'ativo'
$$;

create function public.meu_professor_como_aluno() returns uuid
language sql stable security definer set search_path = '' as $$
  select professor_id from public.alunos where usuario_id = auth.uid() and status = 'ativo'
$$;

create function public.sou_dono_da_ficha(p_ficha uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.fichas where id = p_ficha and professor_id = auth.uid())
$$;

create function public.ficha_ativa_minha(p_ficha uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.fichas
    where id = p_ficha and ativa and aluno_id = public.meu_aluno_id()
  )
$$;

create function public.sou_dono_da_divisao(p_divisao uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.divisoes d join public.fichas f on f.id = d.ficha_id
    where d.id = p_divisao and f.professor_id = auth.uid()
  )
$$;

create function public.divisao_ativa_minha(p_divisao uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.divisoes d join public.fichas f on f.id = d.ficha_id
    where d.id = p_divisao and f.ativa and f.aluno_id = public.meu_aluno_id()
  )
$$;

create function public.posso_ver_sessao(p_sessao uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessoes s
    where s.id = p_sessao
      and (s.professor_id = auth.uid() or s.aluno_id = public.meu_aluno_id())
  )
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.professores enable row level security;
alter table public.alunos enable row level security;
alter table public.convites enable row level security;
alter table public.exercicios enable row level security;
alter table public.fichas enable row level security;
alter table public.divisoes enable row level security;
alter table public.itens_treino enable row level security;
alter table public.sessoes enable row level security;
alter table public.series_realizadas enable row level security;

-- professores: cada um vê e edita o próprio cadastro; o aluno vê o nome do seu professor.
create policy professores_proprio on public.professores
  for select to authenticated using (id = auth.uid() or id = public.meu_professor_como_aluno());
create policy professores_editar on public.professores
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- alunos: o professor gerencia os próprios; o aluno lê o próprio cadastro.
create policy alunos_professor on public.alunos
  for all to authenticated
  using (professor_id = auth.uid())
  with check (professor_id = auth.uid());
create policy alunos_proprio on public.alunos
  for select to authenticated using (usuario_id = auth.uid() and status = 'ativo');

-- convites: só o professor dono. Visitantes validam pelo código via função.
create policy convites_professor on public.convites
  for all to authenticated
  using (professor_id = auth.uid())
  with check (
    professor_id = auth.uid()
    and exists (select 1 from public.alunos a where a.id = aluno_id and a.professor_id = auth.uid())
  );

-- exercícios: biblioteca padrão para todos, próprios só para quem criou
-- (e para os alunos desse professor, que precisam ver o nome e o vídeo).
create policy exercicios_ler on public.exercicios
  for select to authenticated
  using (professor_id is null or professor_id = auth.uid() or professor_id = public.meu_professor_como_aluno());
create policy exercicios_criar on public.exercicios
  for insert to authenticated with check (professor_id = auth.uid());
create policy exercicios_editar on public.exercicios
  for update to authenticated using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy exercicios_apagar on public.exercicios
  for delete to authenticated using (professor_id = auth.uid());

-- fichas: professor gerencia as próprias; aluno lê só a ficha ativa dele.
create policy fichas_professor on public.fichas
  for all to authenticated
  using (professor_id = auth.uid())
  with check (
    professor_id = auth.uid()
    and (aluno_id is null or exists (select 1 from public.alunos a where a.id = aluno_id and a.professor_id = auth.uid()))
  );
create policy fichas_aluno on public.fichas
  for select to authenticated using (ativa and aluno_id = public.meu_aluno_id());

create policy divisoes_professor on public.divisoes
  for all to authenticated
  using (public.sou_dono_da_ficha(ficha_id))
  with check (public.sou_dono_da_ficha(ficha_id));
create policy divisoes_aluno on public.divisoes
  for select to authenticated using (public.ficha_ativa_minha(ficha_id));

create policy itens_professor on public.itens_treino
  for all to authenticated
  using (public.sou_dono_da_divisao(divisao_id))
  with check (public.sou_dono_da_divisao(divisao_id));
create policy itens_aluno on public.itens_treino
  for select to authenticated using (public.divisao_ativa_minha(divisao_id));

-- sessões e séries: leitura pelo professor e pelo próprio aluno.
-- O aluno grava pelo registrar_sessao(); o professor não altera o que o aluno registrou.
create policy sessoes_ler on public.sessoes
  for select to authenticated
  using (professor_id = auth.uid() or aluno_id = public.meu_aluno_id());
create policy series_ler on public.series_realizadas
  for select to authenticated using (public.posso_ver_sessao(sessao_id));

-- =====================================================================
-- Cadastro automático ao criar a conta
-- =====================================================================

-- Gera códigos de convite legíveis (sem 0/O/1/I para evitar confusão).
create function public.gerar_codigo_convite() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  codigo text := '';
  bytes bytea := extensions.gen_random_bytes(8);
begin
  for i in 0..7 loop
    codigo := codigo || substr(alfabeto, (get_byte(bytes, i) % length(alfabeto)) + 1, 1);
  end loop;
  return codigo;
end;
$$;

-- Liga a conta recém-criada ao aluno do convite. Usada pelo gatilho de
-- cadastro e por aceitar_convite() (para quem já tinha conta).
create function public.vincular_convite(p_usuario uuid, p_codigo text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  c public.convites;
begin
  select * into c from public.convites
  where codigo = upper(trim(p_codigo)) and usado_em is null and expira_em > now()
  for update;
  if not found then
    raise exception 'Convite inválido ou expirado' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.professores where id = p_usuario) then
    raise exception 'Esta conta é de professor' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.alunos where usuario_id = p_usuario and id <> c.aluno_id) then
    raise exception 'Esta conta já está ligada a outro aluno' using errcode = 'P0001';
  end if;
  update public.alunos
     set usuario_id = p_usuario, termos_aceitos_em = coalesce(termos_aceitos_em, now())
   where id = c.aluno_id and status = 'ativo';
  if not found then
    raise exception 'Convite inválido ou expirado' using errcode = 'P0001';
  end if;
  update public.convites set usado_em = now() where id = c.id;
  return c.aluno_id;
end;
$$;

-- Ao criar uma conta: tipo "professor" cria o cadastro de professor;
-- um código de convite nos metadados liga a conta ao aluno.
create function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ->> 'tipo' = 'professor' then
    insert into public.professores (id, nome, email)
    values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)), new.email);
  elsif coalesce(new.raw_user_meta_data ->> 'codigo_convite', '') <> '' then
    perform public.vincular_convite(new.id, new.raw_user_meta_data ->> 'codigo_convite');
  end if;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- =====================================================================
-- Funções chamadas pelo app
-- =====================================================================

-- Visitante sem login confere o convite antes de criar a senha.
create function public.validar_convite(p_codigo text)
returns table (aluno_nome text, professor_nome text)
language sql stable security definer set search_path = '' as $$
  select a.nome, p.nome
  from public.convites c
  join public.alunos a on a.id = c.aluno_id
  join public.professores p on p.id = c.professor_id
  where c.codigo = upper(trim(p_codigo)) and c.usado_em is null and c.expira_em > now()
    and a.status = 'ativo' and a.usuario_id is null
$$;

-- Aluno que já tem conta (ou entrou depois de confirmar o e-mail) aceita o convite.
create function public.aceitar_convite(p_codigo text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'É preciso entrar na conta' using errcode = 'P0001';
  end if;
  return public.vincular_convite(auth.uid(), p_codigo);
end;
$$;

-- Professor gera um novo convite para o aluno (o anterior, se não usado, deixa de valer).
create function public.gerar_convite(p_aluno uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare
  novo text;
begin
  if not exists (select 1 from public.alunos where id = p_aluno and professor_id = auth.uid()) then
    raise exception 'Aluno não encontrado' using errcode = 'P0001';
  end if;
  delete from public.convites where aluno_id = p_aluno and usado_em is null;
  loop
    novo := public.gerar_codigo_convite();
    exit when not exists (select 1 from public.convites where codigo = novo);
  end loop;
  insert into public.convites (professor_id, aluno_id, codigo) values (auth.uid(), p_aluno, novo);
  return novo;
end;
$$;

-- Salva a ficha inteira (ficha, divisões e itens) de uma vez.
-- Os ids vêm do app, para que divisões e itens mantidos não mudem de id.
-- Salvar uma ficha de aluno a torna a ficha ativa dele.
create function public.salvar_ficha(p jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce((p ->> 'id')::uuid, gen_random_uuid());
  v_modelo boolean := coalesce((p ->> 'eh_modelo')::boolean, false);
  v_aluno uuid := case when v_modelo then null else (p ->> 'aluno_id')::uuid end;
  d jsonb;
  i jsonb;
  d_ordem int := 0;
  i_ordem int;
  div_ids uuid[] := '{}';
  item_ids uuid[];
  v_div uuid;
begin
  if not exists (select 1 from public.professores where id = auth.uid()) then
    raise exception 'Apenas professores salvam fichas' using errcode = 'P0001';
  end if;
  if not v_modelo and v_aluno is null then
    raise exception 'Escolha o aluno da ficha' using errcode = 'P0001';
  end if;
  if coalesce(trim(p ->> 'nome'), '') = '' then
    raise exception 'Dê um nome para a ficha' using errcode = 'P0001';
  end if;

  if not v_modelo then
    update public.fichas set ativa = false
     where aluno_id = v_aluno and ativa and id <> v_id;
  end if;

  insert into public.fichas (id, professor_id, aluno_id, nome, data_inicio, validade, ativa, eh_modelo, criada_a_partir_de)
  values (
    v_id, auth.uid(), v_aluno, trim(p ->> 'nome'),
    nullif(p ->> 'data_inicio', '')::date, nullif(p ->> 'validade', '')::date,
    not v_modelo, v_modelo, nullif(p ->> 'criada_a_partir_de', '')::uuid
  )
  on conflict (id) do update set
    nome = excluded.nome, data_inicio = excluded.data_inicio, validade = excluded.validade,
    ativa = excluded.ativa, atualizado_em = now()
  where public.fichas.aluno_id is not distinct from excluded.aluno_id
    and public.fichas.eh_modelo = excluded.eh_modelo;
  if not found then
    raise exception 'Ficha não encontrada' using errcode = 'P0001';
  end if;

  for d in select * from jsonb_array_elements(coalesce(p -> 'divisoes', '[]'::jsonb)) loop
    v_div := coalesce((d ->> 'id')::uuid, gen_random_uuid());
    div_ids := div_ids || v_div;
    insert into public.divisoes (id, ficha_id, nome, foco, ordem)
    values (v_div, v_id, coalesce(nullif(trim(d ->> 'nome'), ''), chr(65 + d_ordem)), nullif(trim(d ->> 'foco'), ''), d_ordem)
    on conflict (id) do update set nome = excluded.nome, foco = excluded.foco, ordem = excluded.ordem
    where public.divisoes.ficha_id = excluded.ficha_id;
    if not found then
      raise exception 'Divisão inválida' using errcode = 'P0001';
    end if;

    item_ids := '{}';
    i_ordem := 0;
    for i in select * from jsonb_array_elements(coalesce(d -> 'itens', '[]'::jsonb)) loop
      item_ids := item_ids || coalesce((i ->> 'id')::uuid, gen_random_uuid());
      insert into public.itens_treino (id, divisao_id, exercicio_id, ordem, series, repeticoes, carga_kg, descanso_seg, observacao)
      values (
        item_ids[array_length(item_ids, 1)], v_div, (i ->> 'exercicio_id')::uuid, i_ordem,
        greatest(1, least(20, coalesce(nullif(i ->> 'series', '')::int, 3))),
        coalesce(nullif(trim(i ->> 'repeticoes'), ''), '10'),
        nullif(i ->> 'carga_kg', '')::numeric,
        nullif(i ->> 'descanso_seg', '')::int,
        nullif(trim(i ->> 'observacao'), '')
      )
      on conflict (id) do update set
        exercicio_id = excluded.exercicio_id, ordem = excluded.ordem, series = excluded.series,
        repeticoes = excluded.repeticoes, carga_kg = excluded.carga_kg,
        descanso_seg = excluded.descanso_seg, observacao = excluded.observacao
      where public.itens_treino.divisao_id = excluded.divisao_id;
      if not found then
        raise exception 'Item de treino inválido' using errcode = 'P0001';
      end if;
      i_ordem := i_ordem + 1;
    end loop;
    delete from public.itens_treino where divisao_id = v_div and id <> all (item_ids);
    d_ordem := d_ordem + 1;
  end loop;

  delete from public.divisoes where ficha_id = v_id and id <> all (div_ids);
  return v_id;
end;
$$;

-- Aluno registra o treino feito. O exercício de cada série vem do item da
-- ficha, e a divisão precisa ser da ficha ativa do próprio aluno.
create function public.registrar_sessao(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_aluno public.alunos;
  v_div public.divisoes;
  v_sessao uuid := gen_random_uuid();
  s jsonb;
  v_ex uuid;
begin
  select * into v_aluno from public.alunos where usuario_id = auth.uid() and status = 'ativo';
  if not found then
    raise exception 'Apenas alunos ativos registram treinos' using errcode = 'P0001';
  end if;
  select d.* into v_div from public.divisoes d join public.fichas f on f.id = d.ficha_id
   where d.id = (p ->> 'divisao_id')::uuid and f.ativa and f.aluno_id = v_aluno.id;
  if not found then
    raise exception 'Este treino não é da sua ficha atual' using errcode = 'P0001';
  end if;

  insert into public.sessoes (id, professor_id, aluno_id, divisao_id, divisao_nome, divisao_foco, iniciada_em, finalizada_em, esforco, comentario)
  values (
    v_sessao, v_aluno.professor_id, v_aluno.id, v_div.id, v_div.nome, v_div.foco,
    coalesce((p ->> 'iniciada_em')::timestamptz, now()), coalesce((p ->> 'finalizada_em')::timestamptz, now()),
    nullif(p ->> 'esforco', ''), nullif(trim(p ->> 'comentario'), '')
  );

  for s in select * from jsonb_array_elements(coalesce(p -> 'series', '[]'::jsonb)) loop
    select exercicio_id into v_ex from public.itens_treino
     where id = (s ->> 'item_treino_id')::uuid and divisao_id = v_div.id;
    if v_ex is null then
      raise exception 'Série de exercício fora deste treino' using errcode = 'P0001';
    end if;
    insert into public.series_realizadas (sessao_id, item_treino_id, exercicio_id, numero, repeticoes_feitas, carga_kg, feita)
    values (
      v_sessao, (s ->> 'item_treino_id')::uuid, v_ex, (s ->> 'numero')::int,
      nullif(trim(s ->> 'repeticoes_feitas'), ''), nullif(s ->> 'carga_kg', '')::numeric,
      coalesce((s ->> 'feita')::boolean, true)
    );
  end loop;
  return v_sessao;
end;
$$;

-- Professor e aluno editam nome e telefone do próprio perfil.
create function public.atualizar_meu_perfil(p_nome text, p_telefone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Escreva seu nome' using errcode = 'P0001';
  end if;
  update public.professores set nome = trim(p_nome), telefone = nullif(trim(p_telefone), '') where id = auth.uid();
  update public.alunos set nome = trim(p_nome), telefone = nullif(trim(p_telefone), '')
   where usuario_id = auth.uid() and status = 'ativo';
end;
$$;

-- =====================================================================
-- Permissões das funções: só quem está logado, exceto validar_convite.
-- =====================================================================

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.meu_aluno_id(), public.meu_professor_como_aluno(),
  public.sou_dono_da_ficha(uuid), public.ficha_ativa_minha(uuid),
  public.sou_dono_da_divisao(uuid), public.divisao_ativa_minha(uuid),
  public.posso_ver_sessao(uuid),
  public.aceitar_convite(text), public.gerar_convite(uuid),
  public.salvar_ficha(jsonb), public.registrar_sessao(jsonb),
  public.atualizar_meu_perfil(text, text), public.gerar_codigo_convite()
to authenticated;
grant execute on function public.validar_convite(text) to anon, authenticated;
-- vincular_convite fica só para uso interno (gatilho e aceitar_convite).
