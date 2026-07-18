# Banco e segurança — consolidação final

O SQL final:
- valida a presença da versão 3.0.10;
- revoga execução de funções `SECURITY DEFINER` para `PUBLIC` e `anon`;
- preserva os grants de `authenticated` já existentes;
- adiciona índices operacionais idempotentes;
- registra a baseline de acessibilidade, localidade e viewport;
- registra a versão 3.0.11.

Não há alteração destrutiva de tabelas nem recriação de UUIDs. O rollback não reabre acesso anônimo, por segurança.
