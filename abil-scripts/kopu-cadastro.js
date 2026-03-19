/**
 * kopu-capture.js
 * Captura unificada de leads — Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 4.0
 *
 * Origens monitoradas:
 *   • chat_ao_vivo  → chat-widget com style left  (MutationObserver)
 *   • whatsapp_chat → chat-widget com style right (MutationObserver)
 *   • cadastro      → Formulário /cadastro        (SPA compatible)
 *
 * Estratégia dos widgets GHL:
 *   O <form> só é injetado no Shadow DOM quando o usuário ABRE o widget.
 *   Por isso usamos MutationObserver no shadowRoot de cada widget,
 *   esperando o form aparecer — sem polling com timeout.
 *
 *   Identificação do widget: pelo style do #lc_text-widget
 *     left:  20px → chat_ao_vivo
 *     right: 20px → whatsapp_chat
 */

(function () {
    'use strict';

    console.log('🔵 Abil Kopu: Script iniciado (v4.0)');

    // ════════════════════════════════════════════════════════════
    // CONFIG
    // ════════════════════════════════════════════════════════════

    var CONFIG = {
        webhookUrl:        'https://webhook.abilcrm.com/webhook/kopu-cadastro',
        widgetPollInterval: 300,   // ms aguardando os elementos chat-widget aparecerem
        widgetPollTimeout:  20000, // ms máximo (os elementos, não o form)
        debug:              false
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

    capturarParametrosMarketing();

    // ════════════════════════════════════════════════════════════
    // ENVIO PARA WEBHOOK
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
                ? '✅ Abil Kopu [' + source + ']: Enviado com sucesso (HTTP ' + r.status + ')'
                : '❌ Abil Kopu [' + source + ']: Erro HTTP ' + r.status
            );
        })
        .catch(function (err) {
            console.error('❌ Abil Kopu [' + source + ']:', err);
        });
    }

    // ════════════════════════════════════════════════════════════
    // INJEÇÃO DE UTMs NO GHL VIA registerBeforeSubmit
    // ════════════════════════════════════════════════════════════

    function registrarBeforeSubmitGHL() {
        if (
            !window.leadConnector ||
            !window.leadConnector.chatWidget ||
            typeof window.leadConnector.chatWidget.registerBeforeSubmit !== 'function'
        ) return false;

        window.leadConnector.chatWidget.registerBeforeSubmit(function (contactData) {
            var mkt = capturarParametrosMarketing();
            Object.keys(mkt).forEach(function (key) {
                if (mkt[key]) contactData[key] = mkt[key];
            });
            log('registerBeforeSubmit: UTMs injetadas:', mkt);
            return true;
        });

        console.log('✅ Abil Kopu: registerBeforeSubmit registrado.');
        return true;
    }

    function pollingBeforeSubmit() {
        var deadline = Date.now() + 20000;
        var iv = setInterval(function () {
            if (registrarBeforeSubmitGHL()) { clearInterval(iv); return; }
            if (Date.now() > deadline)      { clearInterval(iv); }
        }, CONFIG.widgetPollInterval);
    }

    // ════════════════════════════════════════════════════════════
    // WIDGETS GHL — DETECÇÃO POR MUTATIONOBSERVER
    //
    // Identificação da origem pelo style do #lc_text-widget:
    //   left  → chat_ao_vivo
    //   right → whatsapp_chat
    //
    // O <form> só existe no Shadow DOM após o usuário clicar
    // para abrir o widget. O Observer fica escutando e anexa
    // o listener de submit no momento em que o form aparece.
    // ════════════════════════════════════════════════════════════

    function resolverFormNoShadow(sr) {
        // Tenta form direto no shadowRoot (shadow DOM simples)
        var form = sr.querySelector('form');
        if (form) return form;

        // Tenta via chat-form (shadow DOM duplo)
        var chatForm = sr.querySelector('chat-form');
        if (chatForm && chatForm.shadowRoot) {
            return chatForm.shadowRoot.querySelector('form');
        }

        return null;
    }

    function resolverCamposDoForm(sr) {
        // Campo pode estar no shadowRoot direto ou dentro de chat-form
        var root = sr;
        var chatForm = sr.querySelector('chat-form');
        if (chatForm && chatForm.shadowRoot) {
            root = chatForm.shadowRoot;
        }
        return {
            nome:     (root.querySelector('#msgsndr_1') || {}).value || '',
            telefone: (root.querySelector('#msgsndr_2') || {}).value || '',
            mensagem: (root.querySelector('#msgsndr_4') || {}).value || ''
        };
    }

    function observarWidget(w, source) {
        var sr = w.shadowRoot;
        if (!sr) return;

        var observer = new MutationObserver(function () {
            var form = resolverFormNoShadow(sr);
            if (!form || form._abilAttached) return;

            form._abilAttached = true;
            observer.disconnect();
            console.log('✅ Abil Kopu [' + source + ']: Form detectado, listener anexado.');

            form.addEventListener('submit', function () {
                var campos = resolverCamposDoForm(sr);
                enviarWebhook(source, {
                    nome:     campos.nome,
                    telefone: campos.telefone,
                    mensagem: campos.mensagem
                });
            });
        });

        observer.observe(sr, { childList: true, subtree: true });
        log('Observer ativo para:', source);
    }

    function identificarEObservarWidgets() {
        var deadline = Date.now() + CONFIG.widgetPollTimeout;

        var iv = setInterval(function () {
            var widgets = document.querySelectorAll('chat-widget');

            if (widgets.length >= 2) {
                clearInterval(iv);

                widgets.forEach(function (w) {
                    var sr = w.shadowRoot;
                    if (!sr) return;

                    var div    = sr.querySelector('#lc_text-widget');
                    var style  = (div && div.getAttribute('style')) || '';
                    var source = style.includes('left:') ? 'chat_ao_vivo' : 'whatsapp_chat';

                    console.log('✅ Abil Kopu: Widget identificado como [' + source + '], aguardando abertura...');
                    observarWidget(w, source);
                });

                return;
            }

            // Se só um widget estiver presente, já observa o que tiver
            if (widgets.length === 1 && !widgets[0]._abilObserved) {
                widgets[0]._abilObserved = true;
                var sr     = widgets[0].shadowRoot;
                var div    = sr && sr.querySelector('#lc_text-widget');
                var style  = (div && div.getAttribute('style')) || '';
                var source = style.includes('left:') ? 'chat_ao_vivo' : 'whatsapp_chat';
                console.log('✅ Abil Kopu: 1 widget encontrado [' + source + '], observando...');
                observarWidget(widgets[0], source);
            }

            if (Date.now() > deadline) {
                clearInterval(iv);
                console.warn('⚠️ Abil Kopu: Nenhum chat-widget encontrado após timeout.');
            }
        }, CONFIG.widgetPollInterval);
    }

    // ════════════════════════════════════════════════════════════
    // LINKS ESTÁTICOS DE WHATSAPP
    // ════════════════════════════════════════════════════════════

    function atualizarLinksWhatsApp() {
        var mkt    = capturarParametrosMarketing();
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
                var url      = new URL(link.href);
                var textoBase = (url.searchParams.get('text') || '').replace(/\s*\[fonte:.*?\]$/, '').trim();
                url.searchParams.set('text', textoBase + sufixo);
                link.href = url.toString();
            } catch (e) { log('Erro ao atualizar link', link.id, e); }
        });

        console.log('✅ Abil Kopu: ' + links.length + ' link(s) de WhatsApp atualizados com UTMs.');
    }

    // ════════════════════════════════════════════════════════════
    // CADASTRO (SPA compatible)
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
        pollingBeforeSubmit();           // injeta UTMs direto no GHL
        identificarEObservarWidgets();   // observers nos dois widgets
        monitorarCadastro();             // formulário /cadastro
        atualizarLinksWhatsApp();        // links estáticos de WA
        console.log('✅ Abil Kopu: Captura ativada (v4.0 — observer mode)');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1500); });
    } else {
        setTimeout(init, 1500);
    }

})();
