# Etapa 08 — Baixas, ajustes e parcelamentos

## Baixas

A RPC `settle_financial_entry` registra baixa total ou parcial com:

- valor efetivamente pago ou recebido;
- conta;
- forma de pagamento;
- desconto;
- juros;
- multa;
- documento;
- observação;
- autor e horário.

Descontos, juros e multas são armazenados em `financial_entry_adjustments`, preservando o valor original do lançamento. O status é recalculado após cada baixa ou estorno.

## Parcelamentos

`create_installment_entries` transforma o lançamento original na primeira parcela e cria as demais. O total é convertido em centavos inteiros, dividido e o resto é distribuído entre as primeiras parcelas. Assim, a soma das parcelas é exatamente igual ao total original.

Lançamentos que já possuem baixa não podem ser parcelados.
