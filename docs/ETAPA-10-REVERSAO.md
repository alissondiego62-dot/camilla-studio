# Reversão da Etapa 10

- restaure o ZIP da Etapa 09 para reverter a aplicação;
- execute o rollback final somente após backup;
- o rollback remove índices e metadados da versão 3.0.11;
- os `REVOKE` de execução anônima não são revertidos automaticamente;
- nenhum dado de projeto, cliente, atividade, agenda, arquivo ou financeiro é apagado.
