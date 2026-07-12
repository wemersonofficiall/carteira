// ============================================
//  FINANÇAS 360 - SCRIPT COMPLETO
//  VERSÃO COMPARTILHADA COM SUPABASE
// ============================================

// ============================================
//  CONFIGURAÇÃO DO SUPABASE
//  ⚠️ SUBSTITUA COM SUAS CHAVES!
// ============================================
const SUPABASE_URL = 'https://acmmjhsckshvlttqnjmc.supabase.co';  // ← COLE SUA URL AQUI
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjbW1qaHNja3Nodmx0dHFuam1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNzczNDgsImV4cCI6MjA5ODk1MzM0OH0.Bw0Kt3_X9ziNxMBaxWdkZLI9EerEdcfrbPmdvEL34Hc';  // ← COLE SUA CHAVE AQUI

// INICIALIZAR SUPABASE
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
//  VARIÁVEIS GLOBAIS
// ============================================
let usuarioAtual = null;
let transacoes = [];
let dividas = [];
let filtroClassificacao = 'todos';
let filtroTipo = 'todos';
let pieChart = null;
let barChart = null;

// ============================================
//  LOGIN / LOGOUT
// ============================================
async function fazerLogin() {
    const nome = document.getElementById('loginUsuario').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();

    if (!nome || !senha) {
        alert('Digite seu nome e senha!');
        return;
    }

    try {
        // Verificar se usuário já existe
        const { data: usuarios, error: buscaError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('nome', nome)
            .eq('senha', senha);

        if (buscaError) {
            alert('Erro ao buscar usuário: ' + buscaError.message);
            return;
        }

        let usuario;

        if (usuarios && usuarios.length > 0) {
            // Usuário existe
            usuario = usuarios[0];
        } else {
            // Criar novo usuário
            const { data: novoUsuario, error: createError } = await supabase
                .from('usuarios')
                .insert([{ nome, senha }])
                .select();

            if (createError) {
                alert('Erro ao criar usuário: ' + createError.message);
                return;
            }
            usuario = novoUsuario[0];
        }

        usuarioAtual = usuario;

        // Mostrar conteúdo principal
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;

        // Carregar dados
        await carregarDados();
        atualizarUI();

    } catch (erro) {
        alert('Erro ao fazer login: ' + erro.message);
    }
}

function fazerLogout() {
    usuarioAtual = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('loginUsuario').value = '';
    document.getElementById('loginSenha').value = '';
}

// ============================================
//  CARREGAR DADOS DO SUPABASE
// ============================================
async function carregarDados() {
    if (!usuarioAtual) return;

    try {
        // Carregar transações
        const { data: transacoesData, error: transError } = await supabase
            .from('transacoes')
            .select('*')
            .eq('usuario', usuarioAtual.nome)
            .order('id', { ascending: false });

        if (transError) throw transError;
        transacoes = transacoesData || [];

        // Carregar dívidas
        const { data: dividasData, error: divError } = await supabase
            .from('dividas')
            .select('*')
            .eq('usuario', usuarioAtual.nome)
            .order('id', { ascending: false });

        if (divError) throw divError;
        dividas = dividasData || [];

        console.log(`✅ Dados carregados: ${transacoes.length} transações, ${dividas.length} dívidas`);

    } catch (erro) {
        console.error('❌ Erro ao carregar dados:', erro);
        alert('Erro ao carregar dados: ' + erro.message);
    }
}

// ============================================
//  SALVAR NO SUPABASE
// ============================================
async function salvarTransacao(transacao) {
    if (!usuarioAtual) return null;
    transacao.usuario = usuarioAtual.nome;

    const { data, error } = await supabase
        .from('transacoes')
        .insert([transacao])
        .select();

    if (error) {
        alert('Erro ao salvar transação: ' + error.message);
        return null;
    }
    return data[0];
}

async function salvarDivida(divida) {
    if (!usuarioAtual) return null;
    divida.usuario = usuarioAtual.nome;

    const { data, error } = await supabase
        .from('dividas')
        .insert([divida])
        .select();

    if (error) {
        alert('Erro ao salvar dívida: ' + error.message);
        return null;
    }
    return data[0];
}

async function deletarTransacao(id) {
    if (!usuarioAtual) return;

    const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erro ao deletar: ' + error.message);
    }
}

async function deletarDivida(id) {
    if (!usuarioAtual) return;

    const { error } = await supabase
        .from('dividas')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erro ao deletar: ' + error.message);
    }
}

async function atualizarDivida(id, dados) {
    if (!usuarioAtual) return;

    const { error } = await supabase
        .from('dividas')
        .update(dados)
        .eq('id', id);

    if (error) {
        alert('Erro ao atualizar: ' + error.message);
    }
}

// ============================================
//  FUNÇÕES DE CÁLCULO
// ============================================
function calcularTotais() {
    let receitas = 0,
        despesas = 0;
    let ativos = 0,
        passivos = 0;
    let renda = 0;

    transacoes.forEach(t => {
        if (t.tipo === 'receita') {
            receitas += t.valor;
            if (t.classificacao === 'ativo') ativos += t.valor;
            if (t.classificacao === 'renda') renda += t.valor;
        } else {
            despesas += t.valor;
            if (t.classificacao === 'passivo') passivos += t.valor;
        }
    });

    const saldo = receitas - despesas;
    const totalDividas = dividas.reduce((acc, d) => acc + d.valor, 0);
    const patrimonio = ativos - passivos - totalDividas;

    return { receitas, despesas, saldo, totalDividas, patrimonio, ativos, passivos, renda };
}

function calcularCrescimento() {
    const { receitas, despesas } = calcularTotais();
    if (receitas === 0 && despesas === 0) return 0;
    if (despesas === 0) return 100;
    return ((receitas - despesas) / (despesas || 1)) * 100;
}

// ============================================
//  FUNÇÕES DE UI
// ============================================
function getClassificacaoLabel(classificacao) {
    const labels = {
        'essencial': 'Gastos Essenciais',
        'hobby': 'Hobbies',
        'investimento': 'Investimentos',
        'passivo': 'Passivos',
        'ativo': 'Ativos',
        'renda': 'Renda'
    };
    return labels[classificacao] || classificacao;
}

function getClassificacaoBadge(classificacao) {
    return `<span class="classificacao-badge ${classificacao}">${getClassificacaoLabel(classificacao)}</span>`;
}

function atualizarUI() {
    const { receitas, despesas, saldo, totalDividas, patrimonio, renda } = calcularTotais();
    const crescimento = calcularCrescimento();

    // Atualizar cards
    document.getElementById('saldoTotal').textContent = `R$ ${saldo.toFixed(2)}`;
    document.getElementById('totalReceitas').textContent = `R$ ${receitas.toFixed(2)}`;
    document.getElementById('totalDespesas').textContent = `R$ ${despesas.toFixed(2)}`;
    document.getElementById('totalDividas').textContent = `R$ ${totalDividas.toFixed(2)}`;
    document.getElementById('patrimonio').textContent = `R$ ${patrimonio.toFixed(2)}`;
    document.getElementById('rendaTotal').textContent = `R$ ${renda.toFixed(2)}`;

    // Crescimento
    const cresStr = crescimento >= 0 ? `+${crescimento.toFixed(1)}%` : `${crescimento.toFixed(1)}%`;
    document.getElementById('crescimentoCard').textContent = cresStr;
    document.getElementById('crescimentoCard').className = `valor ${crescimento >= 0 ? 'verde' : 'vermelho'}`;
    document.getElementById('crescimentoIndice').textContent = cresStr;
    document.getElementById('crescimentoIndice').className = `numero ${crescimento >= 0 ? 'positivo' : 'negativo'}`;

    // Renderizar tabelas
    renderizarTabela();
    renderizarDividas();
    atualizarGraficos();
}

function renderizarTabela() {
    let filtered = [...transacoes];

    if (filtroClassificacao !== 'todos') {
        filtered = filtered.filter(t => t.classificacao === filtroClassific
