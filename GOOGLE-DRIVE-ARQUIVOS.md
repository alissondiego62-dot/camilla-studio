# Google Drive — documentos técnicos

A plataforma usa uma arquitetura híbrida:

- Supabase guarda os dados estruturados e o histórico.
- Google Drive guarda os arquivos reais.

## Estrutura recomendada

```text
Clientes/
└── NOME DO CLIENTE/
    └── CÓDIGO - NOME DO PROJETO/
        ├── 01 Contrato/
        ├── 02 Briefing/
        ├── 03 Levantamento/
        ├── 04 Estudos e criação/
        ├── 05 Projeto executivo/
        ├── 06 Renders/
        ├── 07 RRT e documentos/
        ├── 08 Obra e fotos/
        └── 09 Entrega final/
```

## Uso no sistema

1. Crie ou localize a pasta/arquivo no Google Drive.
2. Copie o link de compartilhamento.
3. Abra o projeto na plataforma.
4. Em **Arquivos no Google Drive**, clique em **Adicionar link**.
5. Informe nome, categoria, URL e observações.

O sistema não envia nem duplica o arquivo. A permissão de acesso continua sendo controlada no próprio Google Drive.
