# App Academia

App para professores de academia montarem as fichas de treino dos alunos. O professor cadastra o aluno, manda um convite pelo WhatsApp e monta a ficha (no celular ou no computador). O aluno abre o app na academia, faz o treino marcando cada série, e o professor vê como foi.

Um só código gera o app de iPhone, de Android e a versão web: **React Native com Expo** (SDK 57, TypeScript, Expo Router). O backend é o **Supabase** (PostgreSQL, login e regras de acesso no banco).

## O que já funciona

**Professor**
- Criar conta, entrar, recuperar senha.
- Início com indicadores (alunos ativos, fichas vencendo, sem ficha, treinos na semana), quem precisa de atenção e os últimos treinos dos alunos.
- Alunos: lista com busca e filtros; cadastro e edição; arquivar e reativar (o histórico fica salvo).
- Convite: link de uso único com validade de 7 dias, código de 8 letras, copiar mensagem ou abrir o WhatsApp com a mensagem pronta.
- Editor de ficha: divisões A, B, C..., exercícios com séries, repetições (aceita faixas como 8-10 e tempos como 30 s), carga, descanso e observação; reordenar; na tela larga, a biblioteca fica ao lado.
- Modelos de ficha: criar, editar, duplicar, excluir, aplicar a um aluno; "Salvar como modelo" a partir da ficha de um aluno; "Nova ficha a partir desta".
- Biblioteca de exercícios: 36 exercícios padrão com link de vídeo do YouTube, mais exercícios próprios de cada professor.
- Detalhe do aluno com a ficha atual, evolução das cargas e treinos feitos (séries, cargas, esforço e comentário).

**Aluno**
- Entra pelo link do convite (ou digitando o código) e cria a senha, aceitando o uso dos dados de treino e saúde.
- Hoje: treino sugerido pela sequência (A, B, C...), com opção de trocar a divisão.
- Treino em andamento: série a série, com carga e repetições editáveis, "última vez", observação do professor, vídeo no YouTube e cronômetro de descanso. O treino fica guardado no aparelho se o app fechar.
- Resumo: minutos, séries feitas, kg levantados, esforço (fácil, ok, difícil) e comentário para o professor.
- Histórico com gráfico de evolução de carga por exercício.

**Segurança**: cada professor só vê os próprios alunos, fichas e treinos; o aluno só vê a própria ficha ativa e o próprio histórico; aluno arquivado perde o acesso. Essas regras ficam no banco (Row Level Security), não só no app.

Fica para depois: cobrança de assinatura, avaliações físicas, notificações, foto de perfil, login com Google ou Apple e exclusão de conta pelo próprio aluno.

## Como configurar

### 1. Criar o projeto no Supabase

1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo (o plano gratuito basta para testes).
2. No projeto, abra **SQL Editor**, cole o conteúdo de `supabase/migrations/20261002000000_inicial.sql` e rode. Depois faça o mesmo com `supabase/migrations/20261002000100_biblioteca_padrao.sql`.
   - Quem usa a [CLI do Supabase](https://supabase.com/docs/guides/cli) pode rodar `supabase link` e `supabase db push` no lugar disso.
3. Em **Authentication > Sign In / Providers > Email**, deixe o login por e-mail ligado. Para testar mais rápido, desligue **Confirm email**; com ele ligado, o app avisa a pessoa para confirmar o e-mail antes de entrar, e tudo continua funcionando.
4. Em **Authentication > URL Configuration**, coloque em **Site URL** o endereço da versão web (quando houver) e adicione em **Redirect URLs** esse endereço com `/**` no fim e também `appacademia://**` (para os links abrirem o app no celular).

### 2. Ligar o app ao projeto

```bash
cp .env.exemplo .env
```

Preencha no `.env` a **Project URL** e a chave **anon public** (em **Project Settings > API**). A chave anon pode ficar no app: quem protege os dados são as regras de acesso do banco. Nunca coloque a chave `service_role` no app.

### 3. Rodar

```bash
npm install
npx expo start
```

- Aperte `w` para abrir no navegador.
- Para o celular, instale o **Expo Go** e leia o QR code (mesma rede Wi-Fi do computador).

## Testes

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test:db     # regras de acesso do banco (precisa de PostgreSQL local)
npm run test:e2e    # fluxo completo no navegador (precisa de PostgreSQL local e Playwright)
```

- `test:db` cria um banco temporário, aplica as migrações e confere 51 regras: professor não vê aluno de outro professor, aluno só vê a própria ficha ativa, convite só vale uma vez, aluno arquivado perde o acesso, e assim por diante.
- `test:e2e` sobe um Supabase local (PostgreSQL, Supabase Auth e PostgREST), gera a versão web e faz o caminho inteiro no Chromium: professor cria a conta, cadastra a aluna, monta a ficha, a aluna entra pelo convite, faz o treino e o professor vê o resultado. As telas ficam em `telas-e2e/`.

## Estrutura

```
src/app/                 telas (Expo Router: cada arquivo é uma rota)
  entrar, criar-conta, recuperar-senha, nova-senha, convite/[codigo]
  professor/(abas)/      início, alunos, modelos, exercícios, perfil
  professor/aluno/       detalhe e formulário do aluno
  professor/ficha.tsx    editor de ficha e de modelo
  aluno/(abas)/          hoje, histórico, perfil
  aluno/treino.tsx       treino em andamento e resumo
src/components/          peças de interface reaproveitadas
src/lib/                 acesso ao Supabase, regras de negócio, datas
supabase/migrations/     esquema do banco, regras de acesso e biblioteca padrão
supabase/tests/          testes das regras de acesso
scripts/                 testes do banco e de ponta a ponta
```

O modelo de dados segue o documento "Tecnologia e modelo de dados" do projeto, com três acréscimos: o campo `foco` na divisão (ex.: "Peito e tríceps"), `divisao_nome` e `divisao_foco` guardados na sessão (para o histórico continuar legível se a ficha mudar) e `termos_aceitos_em` no aluno.

## Publicar nas lojas (mais adiante)

Os builds de iPhone e Android são feitos na nuvem com o EAS (`npx eas-cli@latest build`), sem precisar de Mac. Antes de publicar, troque os identificadores provisórios `app.academia.professor` em `app.json` pelo domínio definitivo e crie as contas de desenvolvedor da Apple e do Google Play.
