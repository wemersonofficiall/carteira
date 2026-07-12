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
        alert('Erro ao deletar transação: ' + error.message);
    }
}

async function deletarDivida(id) {
    if (!usuarioAtual) return;

    const { error } = await supabase
        .from('dividas')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erro ao deletar dívida: ' + error.message);
    }
}

async function atualizarDivida(id, dados) {
    if (!usuarioAtual) return;

    const { error } = await supabase
        .from('dividas')
        .update(dados)
        .eq('id', id);

    if (error) {
        alert('Erro ao atualizar dívida: ' + error.message);
    }
}

// ============================================
//  FUNÇÕES DE CÁLCULO
// ============================================
function calcularTotais() {
    let receitas = 0, despesas = 0;
    let ativos = 0, passivos = 0;
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
//  FUNÇÕES DE UI - CLASSIFICAÇÃO
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

// ============================================
//  ATUALIZAR UI COMPLETO
// ============================================
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

// ============================================
//  TABELA DE TRANSAÇÕES - COMPLETA
// ============================================
function renderizarTabela() {
    let filtered = [...transacoes];

    // Aplicar filtros
    if (filtroClassificacao !== 'todos') {
        filtered = filtered.filter(t => t.classificacao === filtroClassificacao);
    }
    if (filtroTipo !== 'todos') {
        filtered = filtered.filter(t => t.tipo === filtroTipo);
    }

    const tabelaBody = document.getElementById('tabelaBody');

    if (filtered.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="7" class="empty-state">
            <i class="fas fa-inbox"></i><br>Nenhum lançamento encontrado
        </td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach(t => {
        const recorrenciaInfo = t.recorrencia ? `${t.recorrencia} meses` : 'Único';
        const tipoIcon = t.tipo === 'receita' ? '📈' : '📉';
        const tipoCor = t.tipo === 'receita' ? '#2e7d32' : '#c62828';
        const tipoLabel = t.tipo === 'receita' ? 'Receita' : 'Despesa';

        html += `
            <tr>
                <td><strong>${t.descricao}</strong></td>
                <td>${t.categoria}</td>
                <td>${getClassificacaoBadge(t.classificacao)}</td>
                <td><strong>R$ ${t.valor.toFixed(2)}</strong></td>
                <td><span style="color:${tipoCor}">${tipoIcon} ${tipoLabel}</span></td>
                <td><span class="recorrencia-info"><i class="far fa-clock"></i> ${recorrenciaInfo}</span></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removerTransacao(${t.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    tabelaBody.innerHTML = html;
}

// ============================================
//  REMOVER TRANSAÇÃO
// ============================================
async function removerTransacao(id) {
    if (!confirm('Tem certeza que deseja remover este lançamento?')) return;

    await deletarTransacao(id);
    transacoes = transacoes.filter(t => t.id !== id);
    await carregarDados();
    atualizarUI();
}

// ============================================
//  DÍVIDAS - COMPLETO
// ============================================
function renderizarDividas() {
    const listaDividas = document.getElementById('listaDividas');

    if (dividas.length === 0) {
        listaDividas.innerHTML = `<div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>Nenhuma dívida cadastrada</p>
        </div>`;
        return;
    }

    let html = '';
    dividas.forEach(d => {
        const statusClass = d.status === 'pago' ? 'pago' : d.status === 'atrasado' ? 'atrasado' : 'pendente';
        const statusLabel = d.status === 'pago' ? '✅ Pago' : d.status === 'atrasado' ? '⚠️ Atrasado' : '⏳ Pendente';
        const recorrenciaInfo = d.recorrencia ? `${d.recorrencia} meses` : 'Único';
        const vencimentoFormatado = d.vencimento ? new Date(d.vencimento).toLocaleDateString('pt-BR') : 'Não definido';

        html += `
            <div class="divida-item">
                <div class="info">
                    <span class="nome">${d.descricao}</span>
                    <span class="detalhe">
                        <i class="far fa-calendar-alt"></i> Venc: ${vencimentoFormatado} • 
                        <span class="status-badge ${statusClass}">${statusLabel}</span> • 
                        <i class="far fa-clock"></i> ${recorrenciaInfo}
                    </span>
                </div>
                <div class="valor-divida">R$ ${d.valor.toFixed(2)}</div>
                <div class="actions">
                    <button class="btn btn-success btn-sm" onclick="mudarStatusDivida(${d.id}, 'pago')" title="Marcar como pago">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm" style="background:#ff9800;color:#fff;" onclick="mudarStatusDivida(${d.id}, 'pendente')" title="Marcar como pendente">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="removerDivida(${d.id})" title="Excluir dívida">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    listaDividas.innerHTML = html;
}

// ============================================
//  MUDAR STATUS DA DÍVIDA
// ============================================
async function mudarStatusDivida(id, novoStatus) {
    await atualizarDivida(id, { status: novoStatus });
    const d = dividas.find(item => item.id === id);
    if (d) d.status = novoStatus;
    await carregarDados();
    atualizarUI();
}

// ============================================
//  REMOVER DÍVIDA
// ============================================
async function removerDivida(id) {
    if (!confirm('Tem certeza que deseja remover esta dívida?')) return;

    await deletarDivida(id);
    dividas = dividas.filter(d => d.id !== id);
    await carregarDados();
    atualizarUI();
}

// ============================================
//  GRÁFICOS - COMPLETO
// ============================================
function atualizarGraficos() {
    // --- GRÁFICO DE PIZZA ---
    const classificacoes = {};
    transacoes.forEach(t => {
        if (t.tipo === 'despesa') {
            const label = getClassificacaoLabel(t.classificacao);
            classificacoes[label] = (classificacoes[label] || 0) + t.valor;
        }
    });

    const pieLabels = Object.keys(classificacoes);
    const pieData = Object.values(classificacoes);
    const cores = ['#42A5F5', '#AB47BC', '#66BB6A', '#EF5350', '#FFA726', '#26C6DA'];

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();

    if (pieLabels.length === 0) {
        pieChart = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Sem dados'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e0e0e0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    } else {
        pieChart = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: cores.slice(0, pieLabels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let total = context.dataset.data.reduce((a, b) => a + b, 0);
                                let percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': R$ ' + context.parsed.toFixed(2) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // --- GRÁFICO DE BARRAS ---
    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();

    const classificacoesUnicas = ['essencial', 'hobby', 'investimento', 'passivo', 'ativo', 'renda'];
    const receitasPorClass = {};
    const despesasPorClass = {};

    classificacoesUnicas.forEach(c => {
        receitasPorClass[c] = 0;
        despesasPorClass[c] = 0;
    });

    transacoes.forEach(t => {
        if (t.tipo === 'receita') {
            receitasPorClass[t.classificacao] = (receitasPorClass[t.classificacao] || 0) + t.valor;
        } else {
            despesasPorClass[t.classificacao] = (despesasPorClass[t.classificacao] || 0) + t.valor;
        }
    });

    const labels = classificacoesUnicas.map(c => getClassificacaoLabel(c));
    const receitasData = classificacoesUnicas.map(c => receitasPorClass[c] || 0);
    const despesasData = classificacoesUnicas.map(c => despesasPorClass[c] || 0);

    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Receitas',
                    data: receitasData,
                    backgroundColor: 'rgba(46, 125, 50, 0.7)',
                    borderColor: '#2e7d32',
                    borderWidth: 2
                },
                {
                    label: 'Despesas',
                    data: despesasData,
                    backgroundColor: 'rgba(198, 40, 40, 0.7)',
                    borderColor: '#c62828',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: {
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// ============================================
//  FILTROS
// ============================================
function aplicarFiltros() {
    filtroClassificacao = document.getElementById('filtroClassificacao').value;
    filtroTipo = document.getElementById('filtroTipo').value;
    renderizarTabela();
}

function limparFiltros() {
    document.getElementById('filtroClassificacao').value = 'todos';
    document.getElementById('filtroTipo').value = 'todos';
    filtroClassificacao = 'todos';
    filtroTipo = 'todos';
    renderizarTabela();
}

// ============================================
//  ADICIONAR TRANSAÇÃO
// ============================================
async function adicionarTransacao() {
    const descricao = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);
    const tipo = document.getElementById('tipo').value;
    const categoria = document.getElementById('categoria').value;
    const classificacao = document.getElementById('classificacao').value;
    const recorrencia = parseInt(document.getElementById('recorrencia').value) || 0;

    if (!descricao || isNaN(valor) || valor <= 0) {
        alert('⚠️ Preencha todos os campos corretamente!');
        return;
    }

    const transacao = {
        descricao,
        valor,
        tipo,
        categoria,
        classificacao,
        recorrencia: recorrencia > 0 ? recorrencia : 0,
        data: new Date().toISOString().split('T')[0]
    };

    const saved = await salvarTransacao(transacao);
    if (saved) {
        transacoes.push(saved);

        // Se tiver recorrência, criar cópias
        if (recorrencia > 1) {
            for (let i = 1; i < recorrencia; i++) {
                const dataCopy = new Date();
                dataCopy.setMonth(dataCopy.getMonth() + i);
                const copy = {
                    ...transacao,
                    data: dataCopy.toISOString().split('T')[0],
                    recorrencia: 0
                };
                const savedCopy = await salvarTransacao(copy);
                if (savedCopy) transacoes.push(savedCopy);
            }
        }
    }

    // Limpar campos
    document.getElementById('descricao').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('recorrencia').value = '';

    await carregarDados();
    atualizarUI();
}

// ============================================
//  ADICIONAR DÍVIDA
// ============================================
async function adicionarDivida() {
    const descricao = document.getElementById('dividaDesc').value.trim();
    const valor = parseFloat(document.getElementById('dividaValor').value);
    const vencimento = document.getElementById('dividaVenc').value;
    const status = document.getElementById('dividaStatus').value;
    const recorrencia = parseInt(document.getElementById('dividaRecorrencia').value) || 0;

    if (!descricao || isNaN(valor) || valor <= 0) {
        alert('⚠️ Preencha todos os campos da dívida!');
        return;
    }

    const divida = {
        descricao,
        valor,
        vencimento,
        status,
        recorrencia: recorrencia > 0 ? recorrencia : 0
    };

    const saved = await salvarDivida(divida);
    if (saved) {
        dividas.push(saved);

        // Se tiver recorrência, criar cópias
        if (recorrencia > 1) {
            for (let i = 1; i < recorrencia; i++) {
                const dataCopy = new Date(vencimento);
                dataCopy.setMonth(dataCopy.getMonth() + i);
                const copy = {
                    ...divida,
                    vencimento: dataCopy.toISOString().split('T')[0],
                    recorrencia: 0
                };
                const savedCopy = await salvarDivida(copy);
                if (savedCopy) dividas.push(savedCopy);
            }
        }
    }

    // Limpar campos
    document.getElementById('dividaDesc').value = '';
    document.getElementById('dividaValor').value = '';
    document.getElementById('dividaVenc').value = '';
    document.getElementById('dividaRecorrencia').value = '';

    await carregarDados();
    atualizarUI();
}

// ============================================
//  EVENTOS E INICIALIZAÇÃO
// ============================================

// Evento para adicionar transação
document.getElementById('addBtn').addEventListener('click', adicionarTransacao);

// Evento para adicionar dívida
document.getElementById('addDividaBtn').addEventListener('click', adicionarDivida);

// Enter para adicionar transação
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active.id === 'descricao' || active.id === 'valor' || active.id === 'recorrencia') {
            adicionarTransacao();
        }
        if (active.id === 'dividaDesc' || active.id === 'dividaValor' || active.id === 'dividaRecorrencia') {
            adicionarDivida();
        }
    }
});

// ============================================
//  INICIALIZAR - VERIFICAR SE LOGADO
// ============================================
console.log('💰 Finanças 360 v4 - Versão Compartilhada!');
console.log('📱 Acesse de qualquer lugar e compartilhe com sua esposa!');

// Verificar se já está logado (opcional)
// Se quiser manter login, pode adicionar localStorage aqui

// ============================================
//  FUNÇÃO DE TESTE DE CONEXÃO
// ============================================
async function testarConexao() {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('count');

        if (error) {
            console.error('❌ Erro de conexão:', error.message);
            return false;
        }
        console.log('✅ Conexão com Supabase funcionando!');
        return true;
    } catch (erro) {
        console.error('❌ Erro ao testar conexão:', erro.message);
        return false;
    }
}

// Testar conexão ao carregar
testarConexao();
