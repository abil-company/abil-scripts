/**
 * kopu-capture.js
 * Captura unificada de leads — Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 3.0
 *
 * Origens monitoradas:
 *   • chat_ao_vivo  → Widget 1 GHL liveChat  (Shadow DOM duplo: chat-widget → chat-form → campos)
 *   • whatsapp_chat → Widget 2 GHL waChat    (Shadow DOM simples: chat-widget → campos)
 *   • cadastro      → Formulário /cadastro   (SPA compatible)
 *
 * Extras:
 *   • Injeta UTMs via registerBeforeSubmit → dados chegam no GHL automaticamente
 *   • Atualiza links estáticos de WhatsApp com UTMs no texto da mensagem
 */

(function () {
    'use strict';

    console.log('🔵 Abil Kopu: Script iniciado (v3.0)');

    // ════════════════════════════════════════════════════════════
    // CONFIG
    // ════════════════════════════════════════════════════════════

    var CONFIG = {
        webhookUrl:   'https://webhook.abilcrm.com/webhook/kopu-cadastro',
        pollInterval: 300,   // ms entre tentativas
        pollTimeout:  25000, // ms máximo esperando widgets (25s)
        debug:        false
    };

    var log = function () {
        if (!CONFIG.debug) return;
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Abil Kopu]');
        console.log.apply(console, args);
    };

    // ════════════════════════════════════════════════════════════
    // PARÂMETROS DE MARKETING
    // ════════════════════════════════════════════════════════════

    function capturarParametrosMarketing() {
        var urlParams = new URLSearchParams(window.location.search);

        var params = {
            utm_source:   urlParams.get('utm_source')   || '',
            utm_medium:   urlParams.get('utm_medium')   || '',
            utm_campaign: urlParams.get('utm_campaign') || '',
            utm_term:     urlParams.get('utm_term')     || '',
            utm_content:  urlParams.get('utm_content')  || '',
            gclid:        urlParams.get('gclid')        || '',
            fbclid:       urlParams.get('fbclid')       || '',
            msclkid:      urlParams.get('msclkid')      || '',
            ttclid:       urlParams.get('ttclid')       || ''
        };

        var temAlgo = Object.keys(params).some(function (k) { return params[k] !== ''; });

        if (temAlgo) {
            sessionStorage.setItem('abil_marketing_params', JSON.stringify(params));
            log('UTMs salvas:', params);
            return params;
        }

        var salvo = sessionStorage.getItem('abil_marketing_params');
        if (salvo) {
            try { return JSON.parse(salvo); } catch (e) {}
        }

        return params;
    }

    // Captura imediata ao carregar a página
    capturarParametrosMarketing();

    // ════════════════════════════════════════════════════════════
    // ENVIO PARA WEBHOOK PRÓPRIO (n8n)
    // ════════════════════════════════════════════════════════════

    function enviarWebhook(source, dadosExtras) {
        var mkt = capturarParametrosMarketing();

        var payload = Object.assign(
            {
                source:           source,
                timestamp:        new Date().toISOString(),
                data_hora_brasil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                url_pagina:       window.location.href,
                url_origem:       document.referrer || 'Acesso direto',
                utm_source:       mkt.utm_source,
                utm_medium:       mkt.utm_medium,
                utm_campaign:     mkt.utm_campaign,
                utm_term:         mkt.utm_term,
                utm_content:      mkt.utm_content,
                gclid:            mkt.gclid,
                fbclid:           mkt.fbclid,
                msclkid:          mkt.msclkid,
                ttclid:           mkt.ttclid
            },
            dadosExtras || {}
        );

        console.log('📤 Abil Kopu [' + source + ']:', payload);

        fetch(CONFIG.webhookUrl, {
            method:    'POST',
            headers:   { 'Content-Type': 'application/json' },
            body:      JSON.stringify(payload),
            keepalive: true
        })
        .then(function (r) {
            console.log(r.ok
                ? '✅ Abil Kopu [' + source + ']: Enviado (HTTP ' + r.status + ')'
                : '❌ Abil Kopu [' + source + ']: Erro HTTP ' + r.status
            );
        })
        .catch(function (err) {
            console.error('❌ Abil Kopu [' + source + ']:', err);
        });
    }

    // ════════════════════════════════════════════════════════════
    // INJEÇÃO DE UTMs NO GHL VIA registerBeforeSubmit
    // Injeta nos dados do contato ANTES do envio ao GHL,
    // garantindo que as UTMs cheguem nos campos customizados.
    // ════════════════════════════════════════════════════════════

    function registrarBeforeSubmitGHL() {
        if (
            !window.leadConnector ||
            !window.leadConnector.chatWidget ||
            typeof window.leadConnector.chatWidget.registerBeforeSubmit !== 'function'
        ) {
            return false;
        }

        window.leadConnector.chatWidget.registerBeforeSubmit(function (contactData) {
            var mkt = capturarParametrosMarketing();
            Object.keys(mkt).forEach(function (key) {
                if (mkt[key]) contactData[key] = mkt[key];
            });
            log('registerBeforeSubmit: UTMs injetadas:', mkt);
            return true; // true = permite o envio
        });

        console.log('✅ Abil Kopu: registerBeforeSubmit registrado.');
        return true;
    }

    function pollingBeforeSubmit() {
        var deadline = Date.now() + CONFIG.pollTimeout;
        var iv = setInterval(function () {
            if (registrarBeforeSubmitGHL()) { clearInterval(iv); return; }
            if (Date.now() > deadline)      { clearInterval(iv); log('leadConnector API não encontrada.'); }
        }, CONFIG.pollInterval);
    }

    // ════════════════════════════════════════════════════════════
    // WIDGET 1 — CHAT AO VIVO (liveChat)
    // Shadow DOM duplo: chat-widget[0] → chat-form → shadow → form
    // source = 'chat_ao_vivo'
    // ════════════════════════════════════════════════════════════

    function anexarListenerChatAoVivo() {
        var widgets = document.querySelectorAll('chat-widget');
        var w1 = widgets[0];
        if (!w1 || !w1.shadowRoot) return false;

        var chatForm = w1.shadowRoot.querySelector('chat-form');
        if (!chatForm || !chatForm.shadowRoot) return false;

        var form = chatForm.shadowRoot.querySelector('form');
        if (!form) return false;
        if (form._abilAttached) return true;

        form._abilAttached = true;
        console.log('✅ Abil Kopu [chat_ao_vivo]: Shadow DOM duplo encontrado, listener anexado.');

        form.addEventListener('submit', function () {
            var sr = chatForm.shadowRoot;
            enviarWebhook('chat_ao_vivo', {
                nome:     (sr.querySelector('#msgsndr_1') || {}).value || '',
                telefone: (sr.querySelector('#msgsndr_2') || {}).value || ''
            });
        });

        return true;
    }

    // ════════════════════════════════════════════════════════════
    // WIDGET 2 — WHATSAPP CHAT (waChat)
    // Shadow DOM simples: chat-widget[1] → shadow → form
    // source = 'whatsapp_chat'
    // ════════════════════════════════════════════════════════════

    function anexarListenerWhatsAppChat() {
        var widgets = document.querySelectorAll('chat-widget');
        var w2 = widgets[1];
        if (!w2 || !w2.shadowRoot) return false;

        var form = w2.shadowRoot.querySelector('form');
        if (!form) return false;
        if (form._abilAttached) return true;

        form._abilAttached = true;
        console.log('✅ Abil Kopu [whatsapp_chat]: Shadow DOM simples encontrado, listener anexado.');

        form.addEventListener('submit', function () {
            var sr = w2.shadowRoot;
            enviarWebhook('whatsapp_chat', {
                nome:     (sr.querySelector('#msgsndr_1') || {}).value || '',
                telefone: (sr.querySelector('#msgsndr_2') || {}).value || '',
                mensagem: (sr.querySelector('#msgsndr_4') || {}).value || ''
            });
        });

        return true;
    }

    // Polling unificado para os dois widgets GHL
    function pollingWidgetsGHL() {
        var deadline = Date.now() + CONFIG.pollTimeout;
        var w1Ok = false;
        var w2Ok = false;

        var iv = setInterval(function () {
            if (!w1Ok) w1Ok = anexarListenerChatAoVivo();
            if (!w2Ok) w2Ok = anexarListenerWhatsAppChat();

            if (w1Ok && w2Ok) { clearInterval(iv); return; }
            if (Date.now() > deadline) {
                clearInterval(iv);
                if (!w1Ok) console.warn('⚠️ Abil Kopu [chat_ao_vivo]: Widget não encontrado no timeout.');
                if (!w2Ok) console.warn('⚠️ Abil Kopu [whatsapp_chat]: Widget não encontrado no timeout.');
            }
        }, CONFIG.pollInterval);
    }

    // ════════════════════════════════════════════════════════════
    // LINKS ESTÁTICOS DE WHATSAPP
    // Atualiza o parâmetro "text" dos links com rastreio de UTM
    // IDs: link-whatsapp-top-sul, link-whatsapp-top-sp,
    //      link-whatsapp-rodape-sul, link-whatsapp-rodape-sp
    // ════════════════════════════════════════════════════════════

    function atualizarLinksWhatsApp() {
        var mkt = capturarParametrosMarketing();
        var temUtm = Object.keys(mkt).some(function (k) { return mkt[k] !== ''; });
        if (!temUtm) return;

        var links = document.querySelectorAll('a[id^="link-whatsapp"]');
        if (!links.length) return;

        var partes = [];
        if (mkt.utm_source)   partes.push('fonte: '    + mkt.utm_source);
        if (mkt.utm_medium)   partes.push('mídia: '    + mkt.utm_medium);
        if (mkt.utm_campaign) partes.push('campanha: ' + mkt.utm_campaign);

        var sufixo = partes.length ? ' [' + partes.join(' | ') + ']' : '';

        links.forEach(function (link) {
            try {
                var url = new URL(link.href);
                var textoBase = (url.searchParams.get('text') || '').replace(/\s*\[fonte:.*?\]$/, '').trim();
                url.searchParams.set('text', textoBase + sufixo);
                link.href = url.toString();
                log('Link WA atualizado:', link.id);
            } catch (e) {
                log('Erro ao atualizar link', link.id, e);
            }
        });

        console.log('✅ Abil Kopu: ' + links.length + ' link(s) de WhatsApp atualizados com UTMs.');
    }

    // ════════════════════════════════════════════════════════════
    // CADASTRO (SPA compatible — lógica original preservada)
    // source = 'cadastro'
    // ════════════════════════════════════════════════════════════

    function capturarDadosCadastro() {
        var tipoPessoa = '';
        document.querySelectorAll('input[type="radio"]').forEach(function (radio) {
            if (radio.checked) {
                var label = radio.parentElement.textContent.toLowerCase();
                if      (label.includes('jurídica')) tipoPessoa = 'juridica';
                else if (label.includes('física'))   tipoPessoa = 'fisica';
            }
        });

        var dados = { tipo_pessoa: tipoPessoa, nome_fantasia: '', cnpj_cpf: '', nome_contato: '', telefone: '', email: '' };

        document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"], input:not([type])').forEach(function (input) {
            var valor = input.value.trim();
            if (!valor) return;
            var label = ((input.previousElementSibling || {}).textContent || '').toLowerCase();
            var ph    = (input.placeholder || '').toLowerCase();

            if      (label.includes('nome fantasia')  || ph.includes('nome fantasia'))                    dados.nome_fantasia = valor;
            else if (label.includes('cnpj')           || label.includes('cpf') || ph.includes('cnpj'))    dados.cnpj_cpf      = valor;
            else if (label.includes('seu nome')       || ph.includes('seu nome'))                         dados.nome_contato  = valor;
            else if (label.includes('telefone')       || ph.includes('telefone') || input.type === 'tel') dados.telefone      = valor;
            else if (label.includes('e-mail')         || label.includes('email') || input.type === 'email') dados.email       = valor;
        });

        return dados;
    }

    function processarCadastro() {
        var dados = capturarDadosCadastro();
        if (!dados.email) {
            console.warn('⚠️ Abil Kopu [cadastro]: Email não encontrado, envio abortado.');
            return;
        }
        enviarWebhook('cadastro', {
            fonte:         'Website Kopu - Cadastro',
            tipo_pessoa:   dados.tipo_pessoa,
            nome_fantasia: dados.nome_fantasia,
            cnpj_cpf:      dados.cnpj_cpf,
            nome_contato:  dados.nome_contato,
            telefone:      dados.telefone,
            email:         dados.email
        });
    }

    var botoesConfigurados = new Set();

    function tentarConfigurarBotaoCadastro() {
        var encontrou = false;
        document.querySelectorAll('button').forEach(function (btn) {
            if (btn.textContent.trim() === 'Cadastrar' && !botoesConfigurados.has(btn)) {
                btn.addEventListener('click', function () { setTimeout(processarCadastro, 500); });
                botoesConfigurados.add(btn);
                console.log('✅ Abil Kopu [cadastro]: Botão "Cadastrar" configurado.');
                encontrou = true;
            }
        });
        return encontrou;
    }

    function monitorarCadastro() {
        if (!window.location.pathname.includes('cadastro')) return;
        if (tentarConfigurarBotaoCadastro()) return;

        var tentativas = 0;
        var iv = setInterval(function () {
            tentativas++;
            if (!window.location.pathname.includes('cadastro')) { clearInterval(iv); return; }
            if (tentarConfigurarBotaoCadastro())                 { clearInterval(iv); return; }
            if (tentativas >= 60) {
                console.error('❌ Abil Kopu [cadastro]: Botão não encontrado após 30s.');
                clearInterval(iv);
            }
        }, 500);
    }

    // ════════════════════════════════════════════════════════════
    // MONITORAMENTO DE URL (SPA)
    // ════════════════════════════════════════════════════════════

    var ultimaUrl = window.location.href;

    function verificarMudancaUrl() {
        var atual = window.location.href;
        if (atual === ultimaUrl) return;
        log('URL mudou:', atual);
        ultimaUrl = atual;
        capturarParametrosMarketing();
        atualizarLinksWhatsApp();
        setTimeout(monitorarCadastro, 1000);
    }

    new MutationObserver(verificarMudancaUrl).observe(document.body, { childList: true, subtree: true });
    setInterval(verificarMudancaUrl, 1000);
    window.addEventListener('popstate', function () { setTimeout(monitorarCadastro, 1000); });

    // ════════════════════════════════════════════════════════════
    // INICIALIZAÇÃO
    // ════════════════════════════════════════════════════════════

    function init() {
        pollingBeforeSubmit();    // injeta UTMs direto no GHL (ambos os widgets)
        pollingWidgetsGHL();      // dispara webhook próprio com source correto
        monitorarCadastro();      // formulário /cadastro
        atualizarLinksWhatsApp(); // 4 links estáticos de WhatsApp
        console.log('✅ Abil Kopu: Captura ativada (chat_ao_vivo + whatsapp_chat + cadastro + links WA)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

})();
