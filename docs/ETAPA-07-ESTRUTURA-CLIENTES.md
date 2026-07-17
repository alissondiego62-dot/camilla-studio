# Etapa 07 — Estrutura de clientes

A tabela `clients` foi ampliada sem recriar registros ou alterar UUIDs. Telefones e e-mails adicionais ficam em `client_phones` e `client_emails`, mantendo sincronizados os campos legados `clients.phone`, `clients.whatsapp` e `clients.email`.

## Cadastro

- pessoa física ou jurídica;
- nome, razão social e nome fantasia;
- CPF, CNPJ, inscrições estadual e municipal;
- contatos principais e adicionais;
- endereço completo;
- responsável interno, origem, segmento e relacionamento;
- arquivamento e reativação.

Clientes homônimos são permitidos. CPF e CNPJ ativos, quando preenchidos, permanecem únicos após normalização.
