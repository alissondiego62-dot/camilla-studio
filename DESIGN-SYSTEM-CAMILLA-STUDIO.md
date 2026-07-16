# Design System — Camilla Studio

## Fonte oficial

A identidade utiliza a logo em `public/brand/camilla-studio-logo.png`, preservada sem recoloração, deformação ou efeitos.

## Paleta oficial

| Token | RGB | HEX | Uso |
|---|---:|---:|---|
| `--cs-primary` | 94, 48, 33 | `#5E3021` | Navegação e ações principais |
| `--cs-secondary` | 155, 99, 82 | `#9B6352` | Destaques e estados selecionados |
| `--cs-accent` | 211, 192, 189 | `#D3C0BD` | Superfícies suaves e detalhes |
| `--cs-background` | 239, 234, 231 | `#EFEAE7` | Fundo principal |

A última cor utiliza `R = 239`, preservando `G = 234` e `B = 231`.

## Arquivos

- `app/design-tokens.css`: tokens centrais.
- `app/brand-overrides.css`: compatibilidade visual com componentes existentes.
- `app/domain/locale.ts`: padrões pt-BR, BRL e America/Boa_Vista.

Os nomes legados `--publicolor-*` permanecem apenas como aliases temporários para evitar regressão em componentes antigos; todos apontam para a paleta Camilla Studio e não reproduzem a identidade visual da Publicolor.
