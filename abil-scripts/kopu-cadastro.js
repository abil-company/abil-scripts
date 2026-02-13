/**
 * Script de Captura de Cadastro - Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 1.0
 */

(function() {
    'use strict';
    
    console.log('🔵 Abil: Script de Cadastro iniciado');
    
    const ABIL_WEBHOOK_URL = 'https://webhook.abilcrm.com/webhook/kopu-cadastro'; // URL DIFERENTE!
    
    console.log('🔵 Abil: Webhook de cadastro configurado');
    
    // ════════════════════════════════════════════════════════════
    // CAPTURA DE PARÂMETROS DE MARKETING
    // ════════════════════════════════════════════════════════════
    
    function capturarParametrosMarketing() {
        var urlParams = new URLSearchParams(window.location.search);
        
        var parametros = {
            utm_source: urlParams.get('utm_source') || '',
            utm_medium: urlParams.get('utm_medium') || '',
            utm_campaign: urlParams.get('utm_campaign') || '',
            utm_term: urlParams.get('utm_term') || '',
            utm_content: urlParams.get('utm_content') || '',
            gclid: urlParams.get('gclid') || '',
            fbclid: urlParams.get('fbclid') || '',
            msclkid: urlParams.get('msclkid') || '',
            ttclid: urlParams.get('ttclid') || ''
        };
        
        var temParametros = Object.values(parametros).some(function(val) { 
            return val !== ''; 
        });
        
        if (temParametros) {
            console.log('📍 Abil: Parâmetros capturados:', parametros);
            sessionStorage.setItem('abil_cadastro_params', JSON.stringify(parametros));
            return parametros;
        }
        
        var parametrosSalvos = sessionStorage.getItem('abil_cadastro_params');
        if (parametrosSalvos) {
            try {
                var parametrosParsed = JSON.parse(parametrosSalvos);
                console.log('📍 Abil: Parâmetros recuperados:', parametrosParsed);
                return parametrosParsed;
            } catch(e) {
                return parametros;
            }
        }
        
        return parametros;
    }
    
    var parametrosCapturados = capturarParametrosMarketing();
    
    // ════════════════════════════════════════════════════════════
    // CAPTURA DE DADOS DO FORMULÁRIO DE CADASTRO
    // ════════════════════════════════════════════════════════════
    
    function capturarDadosCadastro() {
        // Tipo de pessoa (radio buttons)
        var tipoPessoa = '';
        var radioJuridica = document.querySelector('input[type="radio"][value="juridica"]:checked, input[type="radio"]:checked');
        var radioFisica = document.querySelector('input[type="radio"][value="fisica"]:checked');
        
        if (radioJuridica && radioJuridica.parentElement.textContent.includes('jurídica')) {
            tipoPessoa = 'juridica';
        } else if (radioFisica || (radioJuridica && radioJuridica.parentElement.textContent.includes('física'))) {
            tipoPessoa = 'fisica';
        }
        
        // Campos do formulário
        var inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');
        var dados = {
            tipo_pessoa: tipoPessoa,
            nome_fantasia: '',
            cnpj_cpf: '',
            nome_contato: '',
            telefone: '',
            email: ''
        };
        
        inputs.forEach(function(input) {
            var label = input.previousElementSibling ? input.previousElementSibling.textContent.toLowerCase() : '';
            var placeholder = (input.placeholder || '').toLowerCase();
            var valor = input.value.trim();
            
            if (!valor) return;
            
            // Nome fantasia / Razão Social
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
        
        console.log('👤 Abil: Dados de cadastro capturados:', dados);
        
        return dados;
    }
    
    // ════════════════════════════════════════════════════════════
    // PROCESSAMENTO E ENVIO
    // ════════════════════════════════════════════════════════════
    
    function processarCadastro() {
        console.log('🚀 Abil: Processando cadastro...');
        
        var dadosCadastro = capturarDadosCadastro();
        
        // Validação mínima
        if (!dadosCadastro.email) {
            console.warn('⚠️ Abil: Email obrigatório!');
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
            gclid: parametrosAtuais.gclid,
            fbclid: parametrosAtuais.fbclid,
            msclkid: parametrosAtuais.msclkid,
            ttclid: parametrosAtuais.ttclid
        };
        
        console.log('📤 Abil: Enviando cadastro:', payload);
        
        fetch(ABIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            console.log('📡 Abil: Resposta - Status:', response.status);
            if (response.ok) {
                console.log('✅ Abil: Cadastro enviado com sucesso!');
                return response.json();
            } else {
                throw new Error('Webhook retornou erro: ' + response.status);
            }
        })
        .then(function(data) {
            console.log('✅ Abil: Confirmação:', data);
        })
        .catch(function(erro) {
            console.error('❌ Abil: Erro ao enviar:', erro);
        });
    }
    
    // ════════════════════════════════════════════════════════════
    // MONITORAMENTO DO BOTÃO
    // ════════════════════════════════════════════════════════════
    
    var botaoConfigurado = false;
    
    function tentarConfigurarBotao() {
        if (botaoConfigurado) return true;
        
        var botoes = document.querySelectorAll('button');
        
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            var texto = botao.textContent.trim();
            
            if (texto === 'Cadastrar') {
                console.log('✅ Abil: Botão "Cadastrar" encontrado!');
                
                botao.addEventListener('click', function() {
                    console.log('🎯 Abil: Botão clicado! Aguardando 500ms...');
                    setTimeout(processarCadastro, 500);
                });
                
                botaoConfigurado = true;
                return true;
            }
        }
        
        return false;
    }
    
    function monitorarFormulario() {
        console.log('👀 Abil: Monitorando formulário de cadastro...');
        
        if (!window.location.pathname.includes('cadastro')) {
            console.log('ℹ️ Abil: Não está na página de cadastro');
            return;
        }
        
        console.log('✅ Abil: Está na página de cadastro');
        
        if (tentarConfigurarBotao()) return;
        
        var tentativas = 0;
        var maxTentativas = 40;
        
        var intervalo = setInterval(function() {
            tentativas++;
            
            if (tentarConfigurarBotao()) {
                clearInterval(intervalo);
            } else if (tentativas >= maxTentativas) {
                console.error('❌ Abil: Botão "Cadastrar" não encontrado');
                clearInterval(intervalo);
            }
        }, 500);
    }
    
    // Execução
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(monitorarFormulario, 2000);
        });
    } else {
        setTimeout(monitorarFormulario, 2000);
    }
    
    console.log('✅ Abil: Captura de cadastro ativada');
    
})();
