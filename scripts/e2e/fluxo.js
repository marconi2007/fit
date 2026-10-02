// Teste ponta a ponta: professor cadastra aluna, monta ficha, aluna treina, professor vê o treino.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = 'http://localhost:8081';
const OUT = process.argv[2] || 'telas-e2e';
require('fs').mkdirSync(OUT, { recursive: true });
const sufixo = Date.now().toString(36);
const prof = { nome: 'Marconi Silva', email: `marconi-${sufixo}@exemplo.com`, senha: 'senha123' };
const aluna = { email: `ana-${sufixo}@exemplo.com`, senha: 'senha456' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const erros = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(String(e)));
  let n = 0;
  const foto = async (nome) => page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${nome}.png` });
  const passo = (t) => console.log('•', t);
  const vis = (l) => l.filter({ visible: true });
  const btn = (nome) => vis(page.getByRole('button', { name: nome, exact: true })).first();
  const campo = (nome) => vis(page.getByLabel(nome, { exact: true }));

  try {
    passo('login e criação da conta de professor');
    await page.goto(`${URL}/entrar`);
    await vis(page.getByText('Entre para continuar.')).waitFor();
    await foto('login');
    await btn('Criar conta de professor').click();
    await campo('Seu nome').fill(prof.nome);
    await campo('E-mail').fill(prof.email);
    await campo('Senha').fill(prof.senha);
    await btn('Criar conta').click();
    await vis(page.getByText('Olá, Marconi')).waitFor({ timeout: 15000 });
    await foto('inicio-professor-vazio');

    passo('cadastro da aluna');
    await btn('Novo aluno').click();
    await campo('Nome completo').fill('Ana Souza');
    await campo('Telefone ou e-mail').fill('(11) 98765-4321');
    await campo('Data de nascimento').fill('12041996');
    await campo('Restrições e lesões').fill('Dor leve no joelho direito');
    await btn('Salvar e enviar convite').click();
    await vis(page.getByText('Convite para Ana')).waitFor({ timeout: 15000 });
    const codigo = (await vis(page.getByText(/^Código [A-Z0-9]{8}/)).textContent()).match(/Código ([A-Z0-9]{8})/)[1];
    console.log('  código do convite:', codigo);
    await foto('convite');
    await vis(page.getByRole('button', { name: 'Fechar' })).last().click();

    passo('montar ficha');
    await btn('Montar ficha').click();
    await campo('Nome da ficha').fill('Hipertrofia AB');
    await campo('Foco do Treino A').fill('Peito e tríceps');
    const adicionar = async (nome) => {
      await campo('Buscar exercício').fill(nome);
      await vis(page.getByRole('button', { name: 'Adicionar', exact: true })).first().click();
    };
    await btn('Adicionar exercício ao Treino A').click();
    await adicionar('Supino reto');
    await adicionar('Tríceps na polia');
    await vis(page.getByRole('button', { name: 'Fechar' })).last().click();
    await campo('Carga kg').nth(0).fill('40');
    await campo('Descanso s').nth(0).fill('5');
    await campo('Carga kg').nth(1).fill('25');
    await campo('Observação para o aluno').nth(0).fill('Desça a barra até o peito, sem quicar.');
    await btn('Divisão').click();
    await campo('Foco do Treino B').fill('Pernas');
    await btn('Adicionar exercício ao Treino B').click();
    await adicionar('Agachamento livre');
    await vis(page.getByRole('button', { name: 'Fechar' })).last().click();
    await campo('Carga kg').nth(0).fill('50');
    await vis(page.getByRole('tab')).first().click();
    await foto('editor-ficha');
    await btn('Salvar ficha').click();
    await vis(page.getByText('Hipertrofia AB')).first().waitFor({ timeout: 15000 });
    await vis(page.getByText('Válida até')).first().waitFor();
    await foto('detalhe-aluna');

    passo('sair e entrar como aluna pelo convite');
    await page.goto(`${URL}/professor/perfil`);
    await btn('Sair').click();
    await vis(page.getByText('Entre para continuar.')).waitFor({ timeout: 15000 });
    await page.goto(`${URL}/convite/${codigo.toLowerCase()}`);
    await vis(page.getByText('Olá, Ana!')).waitFor({ timeout: 15000 });
    await campo('Seu e-mail').fill(aluna.email);
    await campo('Crie uma senha').fill(aluna.senha);
    await vis(page.getByRole('checkbox')).first().click();
    await foto('convite-aluna');
    await btn('Criar senha e entrar').click();
    await vis(page.getByText('Treino de hoje')).waitFor({ timeout: 15000 });
    await foto('hoje-aluna');

    passo('fazer o treino A');
    await btn('Começar treino').click();
    await vis(page.getByText('Exercício 1 de 2')).waitFor();
    await campo('Carga da série 2 em kg').fill('42,5');
    for (const i of [1, 2, 3]) await campo(`Marcar série ${i} como feita`).click();
    await vis(page.getByText('Descanso')).first().waitFor();
    await foto('treino-descanso');
    await btn('Próximo').click();
    await campo('Marcar série 1 como feita').click();
    await btn('Finalizar treino').click();
    await btn('Difícil').click();
    await campo('Comentário para o professor').fill('Supino pesado na última série.');
    await foto('resumo');
    await btn('Concluir e enviar').click();
    await vis(page.getByText('Treino B')).first().waitFor({ timeout: 15000 });
    await foto('hoje-depois-do-treino');
    await page.goto(`${URL}/aluno/historico`);
    await vis(page.getByText('Treinos feitos')).waitFor();
    await foto('historico');

    passo('professor vê o treino');
    await page.goto(`${URL}/aluno/perfil`);
    await btn('Sair').click();
    await vis(page.getByText('Entre para continuar.')).waitFor({ timeout: 15000 });
    await campo('E-mail').fill(prof.email);
    await campo('Senha').fill(prof.senha);
    await btn('Entrar').click();
    await vis(page.getByText('Supino pesado na última série.')).waitFor({ timeout: 15000 });
    await foto('inicio-professor-com-treino');
    await vis(page.getByText('Supino pesado na última série.')).click();
    await vis(page.getByText('42,5 kg')).first().waitFor({ timeout: 15000 });
    await foto('treino-visto-pelo-professor');

    passo('telas no computador');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${URL}/professor`);
    await vis(page.getByText('Últimos treinos dos alunos')).waitFor({ timeout: 15000 });
    await foto('computador-inicio');
    await page.goto(`${URL}/professor/alunos`);
    await vis(page.getByText('Último treino')).waitFor({ timeout: 15000 });
    await foto('computador-alunos');
    await vis(page.getByText('Ana Souza')).first().click();
    await btn('Editar ficha').click();
    await vis(page.getByText('Adicionar ao Treino A')).waitFor({ timeout: 15000 });
    await foto('computador-editor');
    console.log('\nFLUXO COMPLETO OK');
  } catch (e) {
    console.log('\nFALHOU:', e.message.split('\n')[0]);
    await foto('falha');
    process.exitCode = 1;
  } finally {
    const relevantes = erros.filter((x) => !/favicon|DevTools/.test(x));
    if (relevantes.length) console.log('Erros no console:\n ' + relevantes.slice(0, 10).join('\n '));
    await browser.close();
  }
})();
