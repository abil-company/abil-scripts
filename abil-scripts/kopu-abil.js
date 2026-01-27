/**
 * Script de Captura de Orçamentos - Kopu Brindes
 * Desenvolvido por: Abil Company
 * Versão: 1.2 - COM RETRY
 */

(function() {
    'use strict';
    
    console.log('🔵 Abil: Script iniciado');
    
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
        console.log('📦 Abil: Dados dos produtos:', produtos);
        
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
        
        // Validações
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
    
    // Variável para controlar se já foi configurado
    var jáConfigurado = false;
    
    function tentarConfigurarBotao() {
        // Se já configurou, não tenta de novo
        if (jáConfigurado) {
            return;
        }
        
        const botaoFinalizar = Array.from(document.querySelectorAll('button')).find(function(btn) {
            return btn.textContent.trim() === 'Finalizar orçamento';
        });
        
        if (botaoFinalizar) {
            console.log('✅ Abil: Botão "Finalizar orçamento" encontrado!');
            console.log('✅ Abil: Listener adicionado ao botão');
            
            botaoFinalizar.addEventListener('click', function() {
                console.log('🎯 Abil: Botão clicado! Aguardando 500ms...');
                setTimeout(processarOrcamento, 500);
            });
            
            jáConfigurado = true;
            return true;
        } else {
            console.log('⏳ Abil: Botão ainda não encontrado, tentando novamente...');
            return false;
        }
    }
    
    function monitorarFormulario() {
        console.log('👀 Abil: Iniciando monitoramento do formulário...');
        
        // Tenta configurar imediatamente
        if (tentarConfigurarBotao()) {
            return; // Já encontrou, não precisa continuar
        }
        
        // Se não encontrou, fica tentando a cada 500ms por até 20 segundos
        var tentativas = 0;
        var maxTentativas = 40; // 40 x 500ms = 20 segundos
        
        var intervalo = setInterval(function() {
            tentativas++;
            
            if (tentarConfigurarBotao()) {
                // Encontrou o botão!
                clearInterval(intervalo);
            } else if (tentativas >= maxTentativas) {
                // Desiste depois de 20 segundos
                console.error('❌ Abil: Botão "Finalizar orçamento" NÃO encontrado após ' + (maxTentativas * 0.5) + ' segundos');
                console.log('🔍 Abil: Botões disponíveis na página:');
                document.querySelectorAll('button').forEach(function(btn, index) {
                    console.log('  ' + (index+1) + ':', btn.textContent.trim());
                });
                clearInterval(intervalo);
            }
        }, 500);
    }
    
    // Aguarda a página carregar completamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', monitorarFormulario);
    } else {
        monitorarFormulario();
    }
    
    console.log('✅ Abil: Captura ativada');
    
})();
```

---

## 🚀 O QUE MUDOU:

1. **Retry automático:** Tenta encontrar o botão a cada 500ms
2. **Timeout longo:** Fica tentando por até 20 segundos
3. **Para quando encontra:** Não desperdiça recursos depois de configurar
4. **Logs detalhados:** Mostra cada tentativa no console

---

## 📋 ATUALIZAR NO GITHUB:

1. https://github.com/thiagosrib/abil-scripts
2. Edita o `kopu-abil.js`
3. **Substitui TODO o código** pelo de cima
4. Commit: `v1.2 - Add retry logic`

---

## 🧪 TESTAR:

Depois do deploy:

1. **Fecha todas as abas** do Kopu
2. **Abre ABA NORMAL** (não anônima)
3. https://kopu.com.br/carrinho
4. **Console (F12)**

Vai aparecer:
```
🔵 Abil: Script iniciado
👀 Abil: Iniciando monitoramento...
⏳ Abil: Botão ainda não encontrado, tentando novamente...
⏳ Abil: Botão ainda não encontrado, tentando novamente...
✅ Abil: Botão "Finalizar orçamento" encontrado!
