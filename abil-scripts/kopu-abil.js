/**
 * Script de Captura de Orçamentos - Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 1.3 - SPA COMPATIBLE
 */

(function() {
    'use strict';
    
    console.log('🔵 Abil: Script iniciado (v1.3 SPA)');
    
    const ABIL_WEBHOOK_URL = 'https://webhook.abilcrm.com/webhook/kopu-orcamento';
    
    console.log('🔵 Abil: Webhook configurado:', ABIL_WEBHOOK_URL);
    
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
        
        const payload = {
            timestamp: new Date().toISOString(),
            data_hora_brasil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            tipo_pessoa: dadosCliente.tipo_pessoa,
            nome_fantasia: dadosCliente.nome_fantasia,
            cnpj_cpf: dadosCliente.cnpj_cpf,
            nome_contato: dadosCliente.nome_contato,
            telefone: dadosCliente.telefone,
            email: dadosCliente.email,
            produtos: produtos,
            total_produtos: produtos.length,
            total_unidades: totalUnidades,
            url_pagina: window.location.href,
            url_origem: document.referrer || 'Acesso direto',
            fonte: 'Website Kopu - Carrinho'
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
    
    var botoesConfigurados = new Set();
    
    function tentarConfigurarBotao() {
        // Procura o botão com texto "Finalizar orçamento"
        var botoes = document.querySelectorAll('button');
        var botaoEncontrado = false;
        
        botoes.forEach(function(botao) {
            var texto = botao.textContent.trim();
            
            // Se o botão tem o texto correto e ainda não foi configurado
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
        
        // Verifica se está na página do carrinho
        if (!window.location.pathname.includes('carrinho')) {
            console.log('ℹ️ Abil: Não está na página do carrinho, aguardando...');
            return;
        }
        
        console.log('✅ Abil: Está na página do carrinho, procurando botão...');
        
        // Tenta configurar imediatamente
        if (tentarConfigurarBotao()) {
            return;
        }
        
        // Se não encontrou, fica tentando
        var tentativas = 0;
        var maxTentativas = 60; // 60 x 500ms = 30 segundos
        
        var intervalo = setInterval(function() {
            tentativas++;
            
            // Verifica se ainda está na página do carrinho
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
            
            // Log a cada 10 tentativas
            if (tentativas % 10 === 0) {
                console.log('⏳ Abil: Ainda procurando... (' + tentativas + ' tentativas)');
            }
        }, 500);
    }
    
    // Monitorar mudanças de URL (para SPAs)
    var ultimaUrl = window.location.href;
    
    function verificarMudancaUrl() {
        var urlAtual = window.location.href;
        
        if (urlAtual !== ultimaUrl) {
            console.log('🔄 Abil: Mudança de URL detectada:', urlAtual);
            ultimaUrl = urlAtual;
            
            // Aguarda um pouco para a página renderizar
            setTimeout(monitorarFormulario, 1000);
        }
    }
    
    // Método 1: MutationObserver (detecta mudanças no DOM)
    var observer = new MutationObserver(function() {
        verificarMudancaUrl();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Método 2: Verificação periódica (fallback)
    setInterval(verificarMudancaUrl, 1000);
    
    // Método 3: Escutar eventos do navegador
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
    
    console.log('✅ Abil: Captura ativada (SPA mode)');
    
})();
