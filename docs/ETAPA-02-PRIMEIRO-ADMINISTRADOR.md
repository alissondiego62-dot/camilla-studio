# Primeiro administrador

## Base atual

A auditoria somente de leitura encontrou um usuário com o papel legado `admin`. Ao aplicar o SQL, esse usuário será associado automaticamente ao perfil **Administrador**, preservando seu UUID e os dados existentes. Portanto, na base atual não é necessário executar bootstrap manual.

## Banco sem administrador

1. Aplique `camilla-studio-etapa-02.sql`.
2. No Supabase Dashboard, abra **Authentication > Users** e copie o UUID do usuário que será o primeiro administrador.
3. No SQL Editor, como proprietária do projeto, execute:

```sql
select public.bootstrap_first_administrator('UUID_DO_USUARIO'::uuid);
```

A função:

- só funciona quando não existe Administrador ou Proprietária ativo;
- usa bloqueio transacional;
- não cria usuário;
- não altera o UUID;
- registra o bootstrap na auditoria.

## Proteção posterior

O último Administrador/Proprietária ativo não pode ser desativado, bloqueado, arquivado ou movido para um perfil não administrativo. Crie e valide um segundo administrador antes de retirar o primeiro.
