# Responsividade final

A versão final adota largura mínima de 320 px e valida os perfis 320, 375, 430, 768, 1024, 1366, 1920 e 2560 px.

Principais controles:
- menu lateral fora da tela abaixo de 900 px;
- drawers com `100dvh` e rolagem interna;
- modais em folha inferior no celular;
- tabelas transformadas em cards quando necessário;
- botões com área mínima de 44 px em telas pequenas;
- safe areas para barra superior e rodapé;
- conteúdo com `min-width: 0` e bloqueio de overflow horizontal global;
- logo com proporção preservada e `object-fit: contain`.
