# Plano de reversão

1. Preserve o ZIP original `camilla-studio-main (2).zip`.
2. Para reversão total, substitua a pasta atual pelo conteúdo do ZIP original.
3. Não há rollback SQL, porque nenhum banco foi alterado.
4. O manifesto `docs/ETAPA-01-MANIFESTO-BASE.json` contém hashes e tamanhos dos arquivos originais.
