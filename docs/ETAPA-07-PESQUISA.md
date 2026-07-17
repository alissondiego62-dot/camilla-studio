# Etapa 07 — Pesquisa

A RPC `search_clients` realiza busca paginada no banco por:

- nome, razão social e nome fantasia;
- CPF e CNPJ com ou sem pontuação;
- telefone e WhatsApp;
- e-mail principal ou adicional.

Filtros disponíveis: tipo de pessoa, relacionamento, origem, segmento, responsável interno e arquivados. A busca usa campos normalizados e índices sem instalar extensões adicionais.
