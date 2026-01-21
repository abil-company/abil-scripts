/**
 * Script de Captura de Orçamentos - Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 1.0
 */

(function() {
    'use strict';
    
    const ABIL_WEBHOOK_URL = 'https://webhook.abilcrm.com/webhook/kopu-orcamento';
    
    function capturarProdutos() {
        const produtos = [];
        const containers = document.querySelectorAll('.bg-white.rounded-lg');
        
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
        
        return produtos;
    }
    
    function capturarDadosCliente() {
        return {
            tipo_pessoa: (document.querySelector('[name="type"]:checked') || {}).value || '',
            nome_fantasia: (document.querySelector('[placeholder="Nome completo"]') || {}).value || '',
            cnpj_cpf: (document.querySelector('[placeholder="12.345.789/0001-10"]') || {}).value || '',
            nome_contato: (document.querySelector('[placeholder="Seu nome"]') || {}).value || '',
            telefone: (document.querySelector('[placeholder="(11) 99090-9090"]') || {}).value || '',
            email: (document.querySelector('[placeholder="email@email.com"]') || {}).value || ''
        };
    }
    
    function processarOrcamento() {
        const dadosCliente = capturarDadosCliente();
        const produtos = capturarProdutos();
        
        if ((!dadosCliente.email && !dadosCliente.telefone) || produtos.length === 0) {
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
        
        fetch(ABIL_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(response) {
            if (response.ok) {
                console.log('✅ Orçamento enviado para Abil');
            }
        })
        .catch(function() {});
    }
    
    function monitorarFormulario() {
        setTimeout(function() {
            const botaoFinalizar = Array.from(document.querySelectorAll('button')).find(function(btn) {
                return btn.textContent.trim() === 'Finalizar orçamento';
            });
            
            if (botaoFinalizar) {
                botaoFinalizar.addEventListener('click', function() {
                    setTimeout(processarOrcamento, 500);
                });
            }
        }, 2000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', monitorarFormulario);
    } else {
        monitorarFormulario();
    }
    
})();
