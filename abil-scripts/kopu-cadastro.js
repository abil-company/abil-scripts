/**
 * Script de Captura de Cadastro - Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 1.1 - SPA COMPATIBLE
 */

(function() {
    'use strict';
    
    console.log('🔵 Abil Cadastro: Script iniciado (v1.1 SPA)');
    
    const ABIL_WEBHOOK_URL = 'https://webhook.abilcrm.com/webhook/kopu-cadastro';
    
    console.log('🔵 Abil Cadastro: Webhook configurado:', ABIL_WEBHOOK_URL);
    
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
            gclid: urlParams.get('gclid') || '',
            fbclid: urlParams.get('fbclid') || '',
            msclkid: urlParams.get('msclkid') || '',
            ttclid: urlParams.get('ttclid') || ''
        };
        
        var temParametros = Object.values(parametros).some(function(val) { 
            return val !== ''; 
        });
        
        if (temParametros) {
            console.log('📍 Abil Cadastro: Parâmetros de marketing capturados:', parametros);
            sessionStorage.setItem('abil_cadastro_params', JSON.stringify(parametros));
            return parametros;
        }
        
        var parametrosSalvos = sessionStorage.getItem('abil_cadastro_params');
        if (parametrosSalvos) {
            try {
                var parametrosParsed = JSON.parse(parametrosSalvos);
                console.log('📍 Abil Cadastro: Parâmetros recuperados do storage:', parametrosParsed);
                return parametrosParsed;
            } catch(e) {
                console.log('📍 Abil Cadastro: Nenhum parâmetro de marketing encontrado');
                return parametros;
            }
        }
        
        console.log('📍 Abil Cadastro: Nenhum parâmetro de marketing encontrado');
        return parametros;
    }
    
    var parametrosCapturados = capturarParametrosMarketing();
    
    // ════════════════════════════════════════════════════════════
    // CAPTURA DE DADOS DO FORMULÁRIO
    // ════════════════════════════════════════════════════════════
    
    function capturarDadosCadastro() {
        // Tipo de pessoa (radio buttons)
        var tipoPessoa = '';
        var radios = document.querySelectorAll('input[type="radio"]');
        
        radios.forEach(function(radio) {
            if (radio.checked) {
                var label = radio.parentElement.textContent.toLowerCase();
                if (label.includes('jurídica')) {
                    tipoPessoa = 'juridica';
                } else if (label.includes('física')) {
                    tipoPessoa = 'fisica';
                }
            }
        });
        
        var dados = {
            tipo_pessoa: tipoPessoa,
            nome_fantasia: '',
            cnpj_cpf: '',
            nome_contato: '',
            telefone: '',
            email: ''
        };
        
        // Captura todos os inputs
        var inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input:not([type])');
        
        inputs.forEach(function(input) {
            var valor = input.value.trim();
            if (!valor) return;
            
            // Tenta identificar pelo label anterior
            var label = '';
            if (input.previousElementSibling && input.previousElementSibling.textContent) {
                label = input.previousElementSibling.textContent.toLowerCase();
            }
            
            var placeholder = (input.placeholder || '').toLowerCase();
            
            // Nome fantasia
            if (label.includes('nome fantasia') || placeholder.includes('nome fantasia')) {
                dados.nome_fantasia = valor;
            }
            // CNPJ/CPF
            else if (label.includes('cnpj') || label.includes('cpf') || placeholder.includes('cnpj')) {
                dados.cnpj_cpf = valor;
            }
            // Nome do contato
            else if (label.includes('seu nome') || placeholder.includes('seu nome')) {
                dados.nome_contato = valor;
            }
            // Telefone
            else if (label.includes('telefone') || placeholder.includes('telefone') || input.type === 'tel') {
                dados.telefone = valor;
            }
            // Email
            else if (label.includes('e-mail') || label.includes('email') || input.type === 'email') {
                dados.email = valor;
            }
        });
        
        console.log('👤 Abil Cadastro: Dados capturados:', dados);
        
        return dados;
    }
    
    // ════════════════════════════════════════════════════════════
    // PROCESSAMENTO E ENVIO
    // ════════════════════════════════════════════════════════════
    
    function processarCadastro() {
        console.log('🚀 Abil Cadastro: Processando cadastro...');
        
        var dadosCadastro = capturarDadosCadastro();
        
        if (!dadosCadastro.email) {
            console.warn('⚠️ Abil Cadastro: Email obrigatório!');
            return;
        }
        
        var parametrosAtuais = capturarParametrosMarketing();
        
        var payload = {
            timestamp: new Date().toISOString(),
            data_hora_brasil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
            
            // Dados do cadastro
            tipo_pessoa: dadosCadastro.tipo_pessoa,
            nome_fantasia: dadosCadastro.nome_fantasia,
            cnpj_cpf: dadosCadastro.cnpj_cpf,
            nome_contato: dadosCadastro.nome_contato,
            telefone: dadosCadastro.telefone,
            email: dadosCadastro.email,
            
            // Rastreamento
            url_pagina: window.location.href,
            url_origem: document.referrer || 'Acesso direto',
            fonte: 'Website Kopu - Cadastro',
            
            // Parâmetros de Marketing
            utm_source: parametrosAtuais.utm_source,
            utm_medium: parametrosAtuais.utm_medium,
            utm_campaign: parametrosAtuais.utm_campaign,
            utm_term: parametrosAtuais.utm_term,
            utm_content: parametrosAtuais.utm_content,
            
            // IDs de Clique
            gclid: parametrosAtuais.gclid,
            fbclid: parametrosAtuais.fbclid,
            msclkid: parametrosAtuais.msclkid,
            ttclid: parametrosAtuais.ttclid
        };
        
        console.log('📤 Abil Cadastro: Enviando payload:', payload);
        
        fetch(ABIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            console.log('📡 Abil Cadastro: Resposta recebida - Status:', response.status);
            if (response.ok) {
                console.log('✅ Abil Cadastro: Cadastro enviado com sucesso!');
                return response.json();
            } else {
                console.error('❌ Abil Cadastro: Erro na resposta do webhook');
                throw new Error('Webhook retornou erro: ' + response.status);
            }
        })
        .then(function(data) {
            console.log('✅ Abil Cadastro: Confirmação do webhook:', data);
        })
        .catch(function(erro) {
            console.error('❌ Abil Cadastro: Erro ao enviar cadastro:', erro);
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
            
            if (texto === 'Cadastrar' && !botoesConfigurados.has(botao)) {
                console.log('✅ Abil Cadastro: Botão "Cadastrar" encontrado!');
                console.log('✅ Abil Cadastro: Listener adicionado ao botão');
                
                botao.addEventListener('click', function() {
                    console.log('🎯 Abil Cadastro: Botão clicado! Aguardando 500ms...');
                    setTimeout(processarCadastro, 500);
                });
                
                botoesConfigurados.add(botao);
                botaoEncontrado = true;
            }
        });
        
        return botaoEncontrado;
    }
    
    function monitorarFormulario() {
        console.log('👀 Abil Cadastro: Iniciando monitoramento (URL: ' + window.location.pathname + ')');
        
        if (!window.location.pathname.includes('cadastro')) {
            console.log('ℹ️ Abil Cadastro: Não está na página de cadastro, aguardando...');
            return;
        }
        
        console.log('✅ Abil Cadastro: Está na página de cadastro, procurando botão...');
        
        if (tentarConfigurarBotao()) {
            return;
        }
        
        var tentativas = 0;
        var maxTentativas = 60;
        
        var intervalo = setInterval(function() {
            tentativas++;
            
            if (!window.location.pathname.includes('cadastro')) {
                console.log('ℹ️ Abil Cadastro: Saiu da página de cadastro, parando busca');
                clearInterval(intervalo);
                return;
            }
            
            if (tentarConfigurarBotao()) {
                clearInterval(intervalo);
            } else if (tentativas >= maxTentativas) {
                console.error('❌ Abil Cadastro: Botão não encontrado após ' + (maxTentativas * 0.5) + ' segundos');
                clearInterval(intervalo);
            }
            
            if (tentativas % 10 === 0) {
                console.log('⏳ Abil Cadastro: Ainda procurando... (' + tentativas + ' tentativas)');
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
            console.log('🔄 Abil Cadastro: Mudança de URL detectada:', urlAtual);
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
        console.log('🔄 Abil Cadastro: Evento popstate detectado');
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
    
    console.log('✅ Abil Cadastro: Captura ativada (SPA mode + UTMs + Click IDs)');
    
})();
