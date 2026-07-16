# Testes — Etapa 06

## Automatizados

- presença das visualizações Dia, Semana e Mês;
- fonte única de dados;
- view `security_invoker`;
- ausência de cópia de atividades e prazos em `calendar_events`;
- atualização por `source_type`;
- rollback otimista;
- duração mínima;
- atividades sem data;
- criação por data e horário;
- SQL e migration idênticos.

## SQL

- preflight;
- postflight;
- integridade;
- duplicidade;
- sincronização transacional em homologação;
- roteiro RLS com usuários de teste.

## Responsividade

Verificar 320, 375, 430, 768, 1024, 1366 e 1920 px. No celular, a edição pelo painel lateral continua disponível como alternativa ao arraste.
