# Sistema de Consulta e Gestão de Favorecidos (TRT4)

Monorepo contendo a aplicação completa para gestão de dados bancários de favorecidos (Advogados, Associações, Peritos e Outros) da Justiça do Trabalho, integrado com **Next.js**, **NestJS**, **Prisma ORM**, **Supabase (PostgreSQL)** e **Render**.

---

## 🏛️ Arquitetura do Projeto

```text
trt4_app/
├── apps/
│   ├── api/                 # Backend NestJS + Prisma
│   │   ├── prisma/          # Schema Prisma específico da API
│   │   ├── src/             # Módulos, controllers e services NestJS
│   │   └── package.json
│   └── web/                 # Frontend Next.js (App Router)
│       ├── app/             # Páginas e componentes React
│       └── package.json
├── prisma/                  # Schema Prisma compartilhado/raiz
├── render.yaml              # Blueprint de deploy declarativo no Render
├── .env.example             # Modelo de variáveis de ambiente
└── package.json             # Workspaces e scripts do Monorepo
```

---

## 🚀 Tecnologias Utilizadas

- **Frontend:** [Next.js](https://nextjs.org/) (React 19, App Router)
- **Backend:** [NestJS](https://nestjs.com/) (Node.js, TypeScript, Class-Validator)
- **ORM & Migrations:** [Prisma ORM](https://www.prisma.io/)
- **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL Gerenciado)
- **Hospedagem & CI/CD:** [Render](https://render.com/)

---

## ⚙️ Variáveis de Ambiente

Copie os arquivos `.env.example` para `.env` conforme o ambiente:

### Backend (`apps/api/.env`)
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
PORT=3001
CORS_ORIGIN="http://localhost:3000,https://seu-frontend.onrender.com"
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 🛠️ Execução Local

1. **Instale as dependências na raiz:**
   ```bash
   npm install
   ```

2. **Gere o Prisma Client:**
   ```bash
   npm run postinstall
   ```

3. **Inicie o Backend e o Frontend:**
   ```bash
   # Terminal 1 - Backend (Porta 3001)
   npm run dev:api

   # Terminal 2 - Frontend (Porta 3000)
   npm run dev:web
   ```

---

## ☁️ Guia de Deploy em Produção (Supabase + Render)

Consulte o passo a passo detalhado na documentação de entrega ou utilize o arquivo [`render.yaml`](./render.yaml) para provisionamento automático no Render.
