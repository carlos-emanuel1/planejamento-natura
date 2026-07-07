// INICIALIZAÇÃO DE VARIÁVEIS DE ESTADO E ACESSO AO LOCALSTORAGE
let AppState = {
    vendas: JSON.parse(localStorage.getItem('nat_vendas')) || [],
    clientes: JSON.parse(localStorage.getItem('nat_clientes')) || [],
    produtos: JSON.parse(localStorage.getItem('nat_produtos')) || [],
    config: JSON.parse(localStorage.getItem('nat_config')) || { metaMensal: 3000, metaSemanal: 750 }
};

// INSTÂNCIAS DE GRÁFICOS DO CHART.JS
let chartLucroInstance = null;
let chartProdutosInstance = null;

// GATILHO INICIAL AO CARREGAR O DOCUMENTO DOM
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initTheme();
    initCalculators();
    initCrudForms();
    renderAllData();
    initGlobalSearch();
    lucide.createIcons(); // Carregar ícones
});

// MOTOR DE NAVEGAÇÃO ENTRE ABAS
function initNavigation() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
            
            const targetTab = btn.getAttribute("data-tab");
            btn.classList.add("active");
            document.getElementById(`tab-${targetTab}`).classList.add("active");
            
            if(targetTab === 'relatorios') renderCharts();
        });
    });
}

// MOTOR DE CONTROLE DO MODO ESCURO
function initTheme() {
    const btn = document.getElementById("toggleTheme");
    btn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", nextTheme);
        btn.querySelector('i').setAttribute('data-lucide', nextTheme === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    });
}

// MOTOR DE PROCESSAMENTO DA CALCULADORA PRINCIPAL E AUXILIARES
function initCalculators() {
    const inputs = ['calc-catalogo', 'calc-desc-cliente', 'calc-desc-nat', 'calc-frete', 'calc-brindes', 'calc-parcelas'];
    inputs.forEach(id => document.getElementById(id).addEventListener('input', runSimulation));

    // Monitoramento da calculadora flutuante de balcão
    document.getElementById('qc-valor').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        document.getElementById('qc-lucro-estimado').innerText = `R$ ${(val * 0.3).toFixed(2)}`;
    });

    // Toggle da barra dock da calculadora rápida
    document.getElementById('quickCalcToggle').addEventListener('click', () => {
        document.getElementById('quickCalcDock').classList.toggle('open');
    });
    document.getElementById('quickCalcClose').addEventListener('click', () => {
        document.getElementById('quickCalcDock').classList.remove('open');
    });

    // Observador para Calculadora de Margem Secundária
    const mInputs = ['margem-custo', 'margem-venda'];
    mInputs.forEach(id => document.getElementById(id).addEventListener('input', () => {
        const custo = parseFloat(document.getElementById('margem-custo').value) || 0;
        const venda = parseFloat(document.getElementById('margem-venda').value) || 0;
        const lucro = venda - custo;
        const pct = venda > 0 ? (lucro / venda) * 100 : 0;
        document.getElementById('m-lucro').innerText = `R$ ${lucro.toFixed(2)}`;
        document.getElementById('m-pct').innerText = `${pct.toFixed(1)}%`;
        document.getElementById('m-markup').innerText = `${custo > 0 ? (venda / custo).toFixed(2) : 0}x`;
    }));

    runSimulation();
}

function setDescCliente(val) {
    document.getElementById('calc-desc-cliente').value = val;
    runSimulation();
}

// SISTEMA REATIVO DE SIMULAÇÃO DE RENTABILIDADE E ALERTAS DE MARGEM (UX SÊNIOR)
function runSimulation() {
    const catalogo = parseFloat(document.getElementById('calc-catalogo').value) || 0;
    const descClientePct = parseFloat(document.getElementById('calc-desc-cliente').value) || 0;
    const descNatPct = parseFloat(document.getElementById('calc-desc-nat').value) || 0;
    const frete = parseFloat(document.getElementById('calc-frete').value) || 0;
    const brindes = parseFloat(document.getElementById('calc-brindes').value) || 0;
    const parcelas = parseInt(document.getElementById('calc-parcelas').value) || 1;

    document.getElementById('lbl-desc-cliente').innerText = `${descClientePct}%`;

    // Operações Matemáticas Base de Venda
    const precoCliente = catalogo * (1 - descClientePct / 100);
    const custoNaturaBase = catalogo * (1 - descNatPct / 100);
    
    // Taxas Dinâmicas de Meios de Pagamento
    let taxaTransacao = 0;
    if(parcelas === 2) taxaTransacao = precoCliente * 0.035;
    if(parcelas === 3) taxaTransacao = precoCliente * 0.049;

    const custoTotalVenda = custoNaturaBase + frete + brindes + taxaTransacao;
    const lucroLiquido = precoCliente - custoTotalVenda;
    const margemRealPct = precoCliente > 0 ? (lucroLiquido / precoCliente) * 100 : 0;
    const economiaCliente = catalogo * (descClientePct / 100);

    // Atualização da UI em Tempo Real
    document.getElementById('sim-venda-cliente').innerText = `R$ ${precoCliente.toFixed(2)}`;
    document.getElementById('sim-custo-nat').innerText = `R$ ${custoTotalVenda.toFixed(2)}`;
    document.getElementById('sim-economia-cliente').innerText = `R$ ${economiaCliente.toFixed(2)}`;
    document.getElementById('sim-lucro-liquido').innerText = `R$ ${lucroLiquido.toFixed(2)}`;
    document.getElementById('sim-margem-pct').innerText = `${margemRealPct.toFixed(1)}%`;

    // Regras de Negócio e Feedbacks de Cores (Semáforo Visual)
    const badge = document.getElementById('sim-status-badge');
    const sugestaoTexto = document.getElementById('sim-sugestao-texto');

    if(margemRealPct >= 30) {
        badge.innerText = "Excelente Rentabilidade";
        badge.style.backgroundColor = "#e8f5e9";
        badge.style.color = "#2e7d32";
        sugestaoTexto.innerText = "Parabéns! Sua margem está protegida e acima do patamar recomendado.";
    } else if(margemRealPct >= 15 && margemRealPct < 30) {
        badge.innerText = "Atenção: Margem Reduzida";
        badge.style.backgroundColor = "#fff3e0";
        badge.style.color = "#ef6c00";
        sugestaoTexto.innerText = `Para manter os 30% ideais, sugerimos dar no máximo ${Math.max(0, descNatPct - 30)}% de desconto para o cliente.`;
    } else {
        badge.innerText = "Alerta: Risco de Prejuízo";
        badge.style.backgroundColor = "#ffebee";
        badge.style.color = "#c62828";
        sugestaoTexto.innerText = "Alerta crítico! O desconto ou custos operacionais inviabilizaram seu ganho.";
    }
}

// ARMAZENAMENTO E RENDERIZAÇÃO DE DADOS (CRUD COMPLETO COM LOCALSTORAGE)
function initCrudForms() {
    // Registro de Vendas Diretas pela Calculadora
    document.getElementById('btn-salvar-venda').addEventListener('click', () => {
        const precoCliente = parseFloat(document.getElementById('sim-venda-cliente').innerText.replace('R$', ''));
        const lucroLiquido = parseFloat(document.getElementById('sim-lucro-liquido').innerText.replace('R$', ''));
        const clienteNome = document.getElementById('calc-venda-cliente').value || "Cliente Não Informado";

        const novaVenda = {
            id: Date.now(),
            cliente: clienteNome,
            data: new Date().toLocaleDateString('pt-BR'),
            total: precoCliente,
            lucro: lucroLiquido,
            status: 'pago'
        };

        AppState.vendas.push(novaVenda);
        saveState();
        renderAllData();
        alert('Venda gravada com sucesso no histórico!');
    });

    // Formulário de Cadastro de Clientes
    document.getElementById('form-cliente').addEventListener('submit', (e) => {
        e.preventDefault();
        const novoCliente = {
            id: Date.now(),
            nome: document.getElementById('c-nome').value,
            tel: document.getElementById('c-tel').value,
            cidade: document.getElementById('c-cidade').value,
            obs: document.getElementById('c-obs').value,
            gastoTotal: 0
        };
        AppState.clientes.push(novoCliente);
        saveState();
        renderAllData();
        e.target.reset();
    });

    // Formulário de Cadastro de Produtos
    document.getElementById('form-produto').addEventListener('submit', (e) => {
        e.preventDefault();
        const novoProduto = {
            id: Date.now(),
            nome: document.getElementById('p-nome').value,
            categoria: document.getElementById('p-categoria').value || 'Geral',
            custo: parseFloat(document.getElementById('p-custo').value),
            venda: parseFloat(document.getElementById('p-venda').value),
            estoque: parseInt(document.getElementById('p-estoque').value) || 0
        };
        AppState.produtos.push(novoProduto);
        saveState();
        renderAllData();
        e.target.reset();
    });

    // Eventos de Exportação de Segurança (JSON e CSV)
    document.getElementById('btn-export-json').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `backup-natura-${Date.now()}.json`);
        dlAnchorElem.click();
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        let csvContent = "data:text/csv;charset=utf-8,Cliente,Data,Total Vendido,Lucro\n";
        AppState.vendas.forEach(v => {
            csvContent += `"${v.cliente}","${v.data}",${v.total},${v.lucro}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_vendas_natura.csv");
        document.body.appendChild(link);
        link.click();
    });
}

function saveState() {
    localStorage.setItem('nat_vendas', JSON.stringify(AppState.vendas));
    localStorage.setItem('nat_clientes', JSON.stringify(AppState.clientes));
    localStorage.setItem('nat_produtos', JSON.stringify(AppState.produtos));
}

// MOTOR DE PROCESSAMENTO DE INDICADORES (KPI) E VISÕES DO DASHBOARD
function renderAllData() {
    // Cálculos de Indicadores Financeiros Avançados
    let totalVendido = 0;
    let lucroMes = 0;
    let totalPendente = 0;
    let totalRecebido = 0;

    AppState.vendas.forEach(v => {
        totalVendido += v.total;
        lucroMes += v.lucro;
        if(v.status === 'pago') totalRecebido += v.total;
        else totalPendente += v.total;
    });

    document.getElementById('kpi-total-vendido').innerText = `R$ ${totalVendido.toFixed(2)}`;
    document.getElementById('kpi-lucro-mes').innerText = `R$ ${lucroMes.toFixed(2)}`;
    document.getElementById('kpi-total-recebido').innerText = `R$ ${totalRecebido.toFixed(2)}`;
    document.getElementById('kpi-total-pendente').innerText = `R$ ${totalPendente.toFixed(2)}`;
    document.getElementById('kpi-qtd-pedidos').innerText = AppState.vendas.length;
    document.getElementById('kpi-ticket-medio').innerText = AppState.vendas.length > 0 ? `R$ ${(totalVendido / AppState.vendas.length).toFixed(2)}` : 'R$ 0,00';

    // Controle da Barra Dinâmica de Metas Estipuladas
    const progressoMensal = Math.min((lucroMes / AppState.config.metaMensal) * 100, 100);
    document.getElementById('bar-meta-mensal').style.width = `${progressoMensal}%`;
    document.getElementById('txt-meta-mensal').innerText = `R$ ${lucroMes.toFixed(2)} / R$ ${AppState.config.metaMensal.toFixed(2)}`;

    // Renderização das Listas Baseadas em Componentes Cards (Sem Tabelas)
    const vendasContainer = document.getElementById('lista-vendas-cards');
    vendasContainer.innerHTML = '';
    AppState.vendas.forEach(v => {
        vendasContainer.innerHTML += `
            <div class="item-card">
                <div>
                    <strong>${v.cliente}</strong>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${v.data}</p>
                </div>
                <div style="text-align: right;">
                    <span class="badge ${v.status === 'pago' ? 'success' : 'danger'}">${v.status.toUpperCase()}</span>
                    <p style="font-weight: 700; margin-top:4px;">R$ ${v.total.toFixed(2)}</p>
                </div>
            </div>
        `;
    });

    // Alimentação das Sugestões Automáticas no Campo de Vinculação de Cliente
    const datalist = document.getElementById('lista-clientes-sugestao');
    datalist.innerHTML = '';
    AppState.clientes.forEach(c => {
        datalist.innerHTML += `<option value="${c.nome}">`;
    });

    // Renderização da Lista de Clientes Ativos
    const clientesContainer = document.getElementById('lista-clientes');
    clientesContainer.innerHTML = '';
    AppState.clientes.forEach(c => {
        clientesContainer.innerHTML += `
            <div class="item-card">
                <div><strong>${c.nome}</strong><p style="font-size:0.8rem;">${c.tel || 'Sem telefone'}</p></div>
                <span class="badge success">Rank Ativo</span>
            </div>
        `;
    });

    // Renderização do Painel de Estoque Atual
    const produtosContainer = document.getElementById('lista-produtos');
    produtosContainer.innerHTML = '';
    AppState.produtos.forEach(p => {
        produtosContainer.innerHTML += `
            <div class="item-card">
                <div><strong>${p.nome}</strong><p style="font-size:0.8rem;">Qtd em Estoque: ${p.estoque} un</p></div>
                <strong>R$ ${p.venda.toFixed(2)}</strong>
            </div>
        `;
    });
}

// MOTOR GRÁFICO AVANÇADO (CHART.JS) PARA RELATÓRIOS INTEGRADOS
function renderCharts() {
    const ctxLucro = document.getElementById('chartLucro').getContext('2d');
    const ctxProd = document.getElementById('chartProdutos').getContext('2d');

    if(chartLucroInstance) chartLucroInstance.destroy();
    if(chartProdutosInstance) chartProdutosInstance.destroy();

    // Mapeamento de Dados de Transações Existentes para os Gráficos
    const datas = AppState.vendas.map(v => v.data);
    const lucros = AppState.vendas.map(v => v.lucro);

    chartLucroInstance = new Chart(ctxLucro, {
        type: 'line',
        data: {
            labels: datas.length ? datas : ['Sem Dados'],
            datasets: [{
                label: 'Lucro Líquido Real (R$)',
                data: lucros.length ? lucros : [0],
                borderColor: '#4a6b42',
                backgroundColor: 'rgba(74, 107, 66, 0.1)',
                fill: true,
                tension: 0.3
            }]
        }
    });

    chartProdutosInstance = new Chart(ctxProd, {
        type: 'bar',
        data: {
            labels: AppState.produtos.map(p => p.nome).slice(0,5).length ? AppState.produtos.map(p => p.nome).slice(0,5) : ['Nenhum Produto'],
            datasets: [{
                label: 'Itens em Estoque',
                data: AppState.produtos.map(p => p.estoque).slice(0,5).length ? AppState.produtos.map(p => p.estoque).slice(0,5) : [0],
                backgroundColor: '#ff6a00'
            }]
        }
    });
}

// RECURSO INTELIGENTE DE PESQUISA GLOBAL (FILTRO RÁPIDO INTERFACE DE USUÁRIO)
function initGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    
    // Atalho de Teclado Profissional (Ctrl + K) para focar na Busca
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if(!query) { renderAllData(); return; }

        // Filtragem Inteligente em Tempo Real nas Coleções
        const vendasFiltradas = AppState.vendas.filter(v => v.cliente.toLowerCase().includes(query));
        const clientesFiltrados = AppState.clientes.filter(c => c.nome.toLowerCase().includes(query));

        // Atualização Expressa das Listas para Exibir Correspondências
        const vendasContainer = document.getElementById('lista-vendas-cards');
        vendasContainer.innerHTML = '';
        vendasFiltradas.forEach(v => {
            vendasContainer.innerHTML += `<div class="item-card"><div><strong>${v.cliente}</strong></div><strong>R$ ${v.total.toFixed(2)}</strong></div>`;
        });
    });
}