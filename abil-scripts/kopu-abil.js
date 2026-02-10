/**
 * Script de Captura de Orçamentos - Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 1.5 - COM UTMs + GCLID + FBCLID
 */

(function() {
    'use strict';
    
    console.log('🔵 Abil: Script iniciado (v1.5 com UTMs + IDs de Clique)');
    
    const ABIL_WEBHOOK_URL = 'https://webhook.abilcrm.com/webhook/kopu-orcamento';
    
    console.log('🔵 Abil: Webhook configurado:', ABIL_WEBHOOK_URL);
    
    // ════════════════════════════════════════════════════════════
    // CAPTURA E PERSISTÊNCIA DE PARÂMETROS DE MARKETING
    // ════════════════════════════════════════════════════════════
    
    function capturarParametrosMarketing() {
        var urlParams = new URLSearchParams(window.location.search);
        
        var parametros = {
            // UTMs padrão
            utm_source: urlParams.get('utm_source') || '',
            utm_medium: urlParams.get('utm_medium') || '',
            utm_campaign: urlParams.get('utm_campaign') || '',
            utm_term: urlParams.get('utm_term') || '',
            utm_content: urlParams.get('utm_content') || '',
            
            // IDs de clique
            gclid: urlParams.get('gclid') || '', // Google Click ID
            fbclid: urlParams.get('fbclid') || '', // Facebook Click ID
            
            // Outros parâmetros úteis (opcionais)
            msclkid: urlParams.get('msclkid') || '', // Microsoft/Bing Click ID
            ttclid: urlParams.get('ttclid') || '' // TikTok Click ID
        };
        
        // Verifica se encontrou algum parâmetro
        var temParametros = Object.values(parametros).some(function(val) { 
            return val !== ''; 
        });
        
        if (temParametros) {
            console.log('📍 Abil: Parâmetros de marketing capturados:', parametros);
            sessionStorage.setItem('abil_marketing_params', JSON.stringify(parametros));
            return parametros;
        }
        
        // Se não tem parâmetros na URL, tenta recuperar do sessionStorage
        var parametrosSalvos = sessionStorage.getItem('abil_marketing_params');
        if (parametrosSalvos) {
            try {
                var parametrosParsed = JSON.parse(parametrosSalvos);
                console.log('📍 Abil: Parâmetros recuperados do storage:', parametrosParsed);
                return parametrosParsed;
            } catch(e) {
                console.log('📍 Abil: Nenhum parâmetro de marketing encontrado');
                return parametros;
            }
        }
        
        console.log('📍 Abil: Nenhum parâmetro de marketing encontrado');
        return parametros;
    }
    
    // Captura parâmetros assim que o script carrega
    var parametrosCapturados = capturarParametrosMarketing();
    
    // ════════════════════════════════════════════════════════════
    // CAPTURA DE DADOS DO FORMULÁRIO
    // ════════════════════════════════════════════════════════════
    
    function capturarProdutos() {
        const produtos = [];
        const containers = document.querySelectorAll('.bg-white.rounded-lg');
        
        console.log('🔍 Abil: Containers encontrados:', containers.length);
        
        containers.forEach(function(container) {
            const nomeElement = container.querySelector('h2, h3, p[class*="font-bold"]');
            const nomeProduto = nomeElement ? nomeElement.textContent.trim() : '';
            
            const textoCompleto = container.textContent;
            const codigoMatch = textoCompleto.match(/REF\.\s*([A-Z0-9\-]+)/i);
            const codigo = codigoMatch ? codigoMatch[1].replace(/Remover/g, '').trim() : '';
            
            const inputs = container.querySelectorAll('input[type="text"]');
            
            if (nomeProduto && codigo && inputs.length >= 3) {
                produtos.push({
                    nome: nomeProduto,
                    codigo: codigo,
                    cor: inputs[0] ? inputs[0].value : '',
                    quantidade: inputs[1] ? inputs[1].value : '',
                    cores_impressao: inputs[2] ? inputs[2].value : ''
                });
            }
        });
        
        console.log('📦 Abil: Produtos capturados:', produtos.length);
        
        return produtos;
    }
    
    function capturarDadosCliente() {
        const dados = {
            tipo_pessoa: (document.querySelector('[name="type"]:checked') || {}).value || '',
            nome_fantasia: (document.querySelector('[placeholder="Nome completo"]') || {}).value || '',
            cnpj_cpf: (document.querySelector('[placeholder="12.345.789/0001-10"]') || {}).value || '',
            nome_contato: (document.querySelector('[placeholder="Seu nome"]') || {}).value || '',
            telefone: (document.querySelector('[placeholder="(11) 99090-9090"]') || {}).value || '',
            email: (document.querySelector('[placeholder="email@email.com"]') || {}).value || ''
        };
        
        console.log('👤 Abil: Dados do cliente capturados:', dados);
        
        return dados;
    }
    
    // ════════════════════════════════════════════════════════════
    // PROCESSAMENTO E ENVIO
    // ════════════════════════════════════════════════════════════
    
    function processarOrcamento() {
        console.log('🚀 Abil: Processando orçamento...');
        
        const dadosCliente = capturarDadosCliente();
        const produtos = capturarProdutos();
        
        if (!dadosCliente.email && !dadosCliente.telefone) {
            console.warn('⚠️ Abil: Email ou telefone obrigatório!');
            return;
        }
        
        if (produtos.length === 0) {
            console.warn('⚠️ Abil: Nenhum produto no carrinho!');
            return;
        }
        
        const totalUnidades = produtos.reduce(function(soma, produto) {
            return soma + parseInt(produto.quantidade || 0);
        }, 0);
        
        // Recaptura parâmetros no momento do envio (caso tenha mudado)
        var parametrosAtuais = capturarParametrosMarketing();
        
        const payload = {
            timestamp: new Date().toISOString(),
            data_hora_brasil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            
            // Dados do cliente
            tipo_pessoa: dadosCliente.tipo_pessoa,
            nome_fantasia: dadosCliente.nome_fantasia,
            cnpj_cpf: dadosCliente.cnpj_cpf,
            nome_contato: dadosCliente.nome_contato,
            telefone: dadosCliente.telefone,
            email: dadosCliente.email,
            
            // Produtos
            produtos: produtos,
            total_produtos: produtos.length,
            total_unidades: totalUnidades,
            
            // Rastreamento
            url_pagina: window.location.href,
            url_origem: document.referrer || 'Acesso direto',
            fonte: 'Website Kopu - Carrinho',
            
            // Parâmetros de Marketing
            utm_source: parametrosAtuais.utm_source,
            utm_medium: parametrosAtuais.utm_medium,
            utm_campaign: parametrosAtuais.utm_campaign,
            utm_term: parametrosAtuais.utm_term,
            utm_content: parametrosAtuais.utm_content,
            
            // IDs de Clique (para conversões)
            gclid: parametrosAtuais.gclid,
            fbclid: parametrosAtuais.fbclid,
            msclkid: parametrosAtuais.msclkid,
            ttclid: parametrosAtuais.ttclid
        };
        
        console.log('📤 Abil: Enviando payload:', payload);
        
        fetch(ABIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            console.log('📡 Abil: Resposta recebida - Status:', response.status);
            if (response.ok) {
                console.log('✅ Abil: Orçamento enviado para Abil com sucesso!');
                return response.json();
            } else {
                console.error('❌ Abil: Erro na resposta do webhook');
                throw new Error('Webhook retornou erro: ' + response.status);
            }
        })
        .then(function(data) {
            console.log('✅ Abil: Confirmação do webhook:', data);
        })
        .catch(function(erro) {
            console.error('❌ Abil: Erro ao enviar orçamento:', erro);
        });
    }
    
    // ════════════════════════════════════════════════════════════
    // MONITORAMENTO DO BOTÃO (SPA COMPATIBLE)
    // ════════════════════════════════════════════════════════════
    
    var botoesConfigurados = new Set();
    
    function tentarConfigurarBotao() {
        var botoes = document.querySelectorAll('button');
        var botaoEncontrado = false;
        
        botoes.forEach(function(botao) {
            var texto = botao.textContent.trim();
            
            if (texto === 'Finalizar orçamento' && !botoesConfigurados.has(botao)) {
                console.log('✅ Abil: Botão "Finalizar orçamento" encontrado!');
                console.log('✅ Abil: Listener adicionado ao botão');
                
                botao.addEventListener('click', function() {
                    console.log('🎯 Abil: Botão clicado! Aguardando 500ms...');
                    setTimeout(processarOrcamento, 500);
                });
                
                botoesConfigurados.add(botao);
                botaoEncontrado = true;
            }
        });
        
        return botaoEncontrado;
    }
    
    function monitorarFormulario() {
        console.log('👀 Abil: Iniciando monitoramento (URL: ' + window.location.pathname + ')');
        
        if (!window.location.pathname.includes('carrinho')) {
            console.log('ℹ️ Abil: Não está na página do carrinho, aguardando...');
            return;
        }
        
        console.log('✅ Abil: Está na página do carrinho, procurando botão...');
        
        if (tentarConfigurarBotao()) {
            return;
        }
        
        var tentativas = 0;
        var maxTentativas = 60;
        
        var intervalo = setInterval(function() {
            tentativas++;
            
            if (!window.location.pathname.includes('carrinho')) {
                console.log('ℹ️ Abil: Saiu da página do carrinho, parando busca');
                clearInterval(intervalo);
                return;
            }
            
            if (tentarConfigurarBotao()) {
                clearInterval(intervalo);
            } else if (tentativas >= maxTentativas) {
                console.error('❌ Abil: Botão não encontrado após ' + (maxTentativas * 0.5) + ' segundos');
                clearInterval(intervalo);
            }
            
            if (tentativas % 10 === 0) {
                console.log('⏳ Abil: Ainda procurando... (' + tentativas + ' tentativas)');
            }
        }, 500);
    }
    
    // ════════════════════════════════════════════════════════════
    // MONITORAMENTO DE URL (SPA)
    // ════════════════════════════════════════════════════════════
    
    var ultimaUrl = window.location.href;
    
    function verificarMudancaUrl() {
        var urlAtual = window.location.href;
        
        if (urlAtual !== ultimaUrl) {
            console.log('🔄 Abil: Mudança de URL detectada:', urlAtual);
            ultimaUrl = urlAtual;
            
            // Recaptura parâmetros se houver na nova URL
            capturarParametrosMarketing();
            
            setTimeout(monitorarFormulario, 1000);
        }
    }
    
    var observer = new MutationObserver(function() {
        verificarMudancaUrl();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    setInterval(verificarMudancaUrl, 1000);
    
    window.addEventListener('popstate', function() {
        console.log('🔄 Abil: Evento popstate detectado');
        setTimeout(monitorarFormulario, 1000);
    });
    
    // Execução inicial
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(monitorarFormulario, 2000);
        });
    } else {
        setTimeout(monitorarFormulario, 2000);
    }
    
    console.log('✅ Abil: Captura ativada (SPA mode + UTMs + Click IDs)');
    
})();
