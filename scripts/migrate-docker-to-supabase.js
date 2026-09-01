require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const localDatabaseUrl =
  process.env.LOCAL_DATABASE_URL ||
  'postgresql://app_user:app_password@127.0.0.1:5434/favorecidos_db?schema=public';

const supabaseDatabaseUrl =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!supabaseDatabaseUrl) {
  console.error('❌ Defina a variável SUPABASE_DATABASE_URL ou DATABASE_URL antes de rodar a sincronização.');
  process.exit(1);
}

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: localDatabaseUrl,
    },
  },
});

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: supabaseDatabaseUrl,
    },
  },
});

async function main() {
  console.log('🔄 Conectando ao Docker local e lendo registros atualizados...');

  const favorecidosLocais = await localPrisma.favorecido.findMany({
    include: {
      contas: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`📦 Encontrados ${favorecidosLocais.length} favorecidos no Docker local.`);

  let totalContas = 0;
  favorecidosLocais.forEach((f) => {
    totalContas += (f.contas || []).length;
  });
  console.log(`💳 Encontradas ${totalContas} contas bancárias vinculadas no Docker local.`);

  let auditEvents = [];
  try {
    auditEvents = await localPrisma.audit_events.findMany();
    console.log(`📋 Encontrados ${auditEvents.length} eventos de auditoria.`);
  } catch (e) {
    console.log('Nenhum evento de auditoria ou tabela vazia.');
  }

  console.log('🧹 Limpando dados legados do Supabase em produção...');
  await supabasePrisma.contaBancaria.deleteMany();
  await supabasePrisma.favorecido.deleteMany();
  try {
    await supabasePrisma.audit_events.deleteMany();
  } catch (e) {}

  console.log('🚀 Migrando todos os favorecidos e contas do Docker local para o Supabase...');

  let inseridos = 0;
  for (const item of favorecidosLocais) {
    await supabasePrisma.favorecido.create({
      data: {
        id: item.id,
        nome: item.nome,
        tipoCadastro: item.tipoCadastro,
        tipoDocumento: item.tipoDocumento,
        documento: item.documento,
        status: item.status,
        situacaoEspecial: item.situacaoEspecial,
        observacaoOperacional: item.observacaoOperacional,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        contas: {
          create: (item.contas || []).map((c) => ({
            id: c.id,
            bancoNome: c.bancoNome,
            bancoCodigo: c.bancoCodigo,
            agencia: c.agencia,
            operacaoProduto: c.operacaoProduto,
            conta: c.conta,
            contaNumero: c.contaNumero,
            contaDigito: c.contaDigito,
            tipoConta: c.tipoConta,
            contaPreferencial: c.contaPreferencial,
            titularConfirmado: c.titularConfirmado,
            titularContaNome: c.titularContaNome,
            titularContaDocumento: c.titularContaDocumento,
            titularTipoDocumento: c.titularTipoDocumento,
            statusValidacao: c.statusValidacao,
            fonte: c.fonte,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          })),
        },
      },
    });
    inseridos++;
  }

  if (auditEvents.length > 0) {
    console.log('📋 Migrando eventos de auditoria...');
    for (const event of auditEvents) {
      await supabasePrisma.audit_events.create({
        data: {
          id: event.id,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          event_type: event.event_type,
          actor_id: event.actor_id,
          occurred_at: event.occurred_at,
          before_data: event.before_data,
          after_data: event.after_data,
          notes: event.notes,
        },
      });
    }
  }

  console.log(`✅ Sincronização concluída com sucesso absoluto!`);
  console.log(`🎉 ${inseridos} favorecidos e ${totalContas} contas bancárias migrados com total fidelidade para o Supabase.`);
}

main()
  .catch((err) => {
    console.error('❌ Erro durante a migração:', err);
    process.exit(1);
  })
  .finally(async () => {
    await localPrisma.$disconnect();
    await supabasePrisma.$disconnect();
  });
