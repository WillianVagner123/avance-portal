# Login estático sem Supabase

A autenticação por email e senha não consulta mais Prisma, banco PostgreSQL ou Supabase. O NextAuth lê usuários de variáveis de ambiente.

## Opção 1: um usuário

Configure no ambiente de deploy:

```env
STATIC_LOGIN_EMAIL=admin@exemplo.com
STATIC_LOGIN_PASSWORD_HASH=hash_bcrypt_da_senha
STATIC_LOGIN_NAME=Administrador
STATIC_LOGIN_ROLE=MASTER
STATIC_LOGIN_STATUS=ACTIVE
```

## Opção 2: vários usuários

Configure `STATIC_USERS_JSON` como um array JSON:

```json
[
  {
    "id": "user-1",
    "email": "profissional@exemplo.com",
    "name": "Profissional",
    "passwordHash": "hash_bcrypt_da_senha",
    "role": "PROFESSIONAL",
    "status": "ACTIVE"
  }
]
```

Também é aceito o campo `password` quando ele já contém um hash bcrypt exportado da tabela de usuários antiga.

## Gerar hash bcrypt

Rode dentro do projeto:

```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('SUA_SENHA_AQUI', 10).then(console.log)"
```

Não publique senha em texto puro no GitHub. Em repositório público, até hashes bcrypt devem ficar em Secrets/variáveis do deploy, não em arquivos versionados.
