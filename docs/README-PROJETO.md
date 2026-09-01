# Projeto completo

## Estrutura
- `apps/api`: backend NestJS + Prisma
- `apps/web`: frontend Next.js
- `db/init.sql`: schema e trigger de auditoria
- `seeds/favorecidos-seed.json`: base inicial

## Execução
1. Copie `.env.example` para `.env`.
2. Suba PostgreSQL com `docker compose up -d`.
3. No backend, instale dependências, gere Prisma e suba a API.
4. No frontend, instale dependências e rode o app.

## Observação
O projeto foi reduzido intencionalmente ao núcleo fiscal-bancário. O documento original continha outros campos, mas eles foram excluídos do escopo por decisão funcional do usuário.
