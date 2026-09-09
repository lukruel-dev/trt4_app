require('dotenv').config({ path: 'apps/web/.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Ativando Row Level Security (RLS) nas tabelas do Supabase...');

  const tables = ['favorecidos', 'contas_bancarias', 'audit_events'];

  for (const table of tables) {
    console.log(`- Ativando RLS na tabela public.${table}...`);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
  }

  console.log('✅ RLS ativado com sucesso em todas as tabelas!');

  // Testar leitura via Prisma
  const count = await prisma.favorecido.count();
  console.log(`🧪 Teste de consulta Prisma: ${count} favorecidos lidos com sucesso.`);
}

main()
  .catch((error) => {
    console.error('❌ Erro ao ativar RLS:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
