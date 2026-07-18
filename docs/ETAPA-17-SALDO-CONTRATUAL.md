# Etapa 17 — Saldo contratual integrado

## Regra central

Para cada projeto, o sistema apresenta:

- **Valor do contrato:** campo contratual do projeto.
- **Valor recebido:** maior valor entre o histórico recebido já existente no projeto e a soma dos recebimentos profissionais vinculados.
- **Valor a receber:** `máximo(contrato − recebido, 0)`.

A regra de transição evita apagar os valores antigos e também evita somá-los duas vezes quando os lançamentos forem recadastrados. Depois que os novos recebimentos vinculados ultrapassam ou igualam a base antiga, eles passam a determinar o total apresentado.

## Integração

A mesma fonte calculada é utilizada em:

- página Financeiro;
- listagem de Projetos;
- ficha individual do projeto;
- projetos da ficha do cliente.

Os lançamentos criados na ficha do projeto utilizam `financial_entries` no ambiente profissional e aparecem no Financeiro geral.

## Confidencialidade

Os valores ficam disponíveis somente aos perfis de sistema:

- `administrator`;
- `owner`, considerado autoridade superior ao Administrador.

A restrição existe no menu, nos componentes, nas consultas e no banco. As colunas `contract_value`, `amount_received` e `balance_due` deixam de ter leitura direta para o papel `authenticated`; a leitura ocorre por RPCs administrativas.

## Dados preservados

A migration não exclui nem arquiva projetos, contratos, recebimentos ou lançamentos financeiros.
