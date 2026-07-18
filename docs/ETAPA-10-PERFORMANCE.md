# Performance final

Ações realizadas:
- remoção de código legado não importado;
- redução de consultas `select(*)` em serviços críticos;
- histórico iniciado em lotes de 100 registros;
- manutenção do carregamento sob demanda de comentários, arquivos e históricos;
- preservação de consultas por período na Agenda;
- índices para prazos, responsáveis, relações, não lidos, histórico e financeiro;
- auditoria de bundle com limite de 260 KiB para o maior chunk JavaScript e 130 KiB para CSS.

O Supabase permanece como fonte oficial; nenhuma regra foi movida para Google Drive ou para o navegador.
