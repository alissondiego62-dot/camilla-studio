# Etapa 03 — Miniaturas de projetos

## Formatos

- PNG;
- JPG/JPEG;
- WEBP;
- limite padrão de 8 MB.

## Armazenamento

As imagens ficam no bucket privado `project-thumbnails`. Cada caminho começa com o UUID do projeto:

```text
<project_id>/<uuid-do-arquivo>.<extensão>
```

A interface utiliza URLs assinadas temporárias. O bucket não é público.

## Histórico e versões

A tabela `project_thumbnails` registra:

- projeto;
- bucket e caminho;
- MIME e tamanho;
- versão;
- autor;
- criação;
- estado ativo;
- remoção e responsável.

A substituição desativa a versão anterior e cria outra versão. A remoção é lógica no banco; em seguida, o cliente solicita a exclusão do objeto do Storage. A política de leitura só permite acessar a miniatura ativa, reduzindo exposição de objetos removidos ou versões antigas.

`projects.cover_url` é preservado como compatibilidade e fallback para imagens antigas.
