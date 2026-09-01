const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const seedPath =
  process.argv[2] ||
  path.join(process.cwd(), 'favorecidos-casos-especiais.json');

function contaData(c) {
  return {
    bancoNome: c.bancoNome || null,
    bancoCodigo: c.bancoCodigo || null,
    agencia: c.agencia || null,
    operacaoProduto: c.operacaoProduto || null,
    conta: c.conta || null,
    contaNumero: c.contaNumero || null,
    contaDigito: c.contaDigito || null,
    tipoConta: c.tipoConta || null,
    contaPreferencial: !!c.contaPreferencial,
    titularConfirmado: !!c.titularConfirmado,
    titularContaNome: c.titularContaNome || null,
    titularContaDocumento: c.titularContaDocumento || null,
    titularTipoDocumento: c.titularTipoDocumento || null,
    statusValidacao: c.statusValidacao || 'Pendente',
    fonte: c.fonte || 'Importação JSON'
  };
}

async function main() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Arquivo de seed não encontrado: ${seedPath}`);
  }

  const raw = fs.readFileSync(seedPath, 'utf-8');
  const items = JSON.parse(raw);

  let inserted = 0;
  let updated = 0;

  for (const item of items) {
    const existing =
      (item.documento &&
        (await prisma.favorecido.findFirst({
          where: { documento: item.documento },
          include: { contas: true }
        }))) ||
      (await prisma.favorecido.findFirst({
        where: { nome: item.nome },
        include: { contas: true }
      }));

    if (existing) {
      await prisma.contaBancaria.deleteMany({
        where: { favorecidoId: existing.id }
      });

      await prisma.favorecido.update({
        where: { id: existing.id },
        data: {
          nome: item.nome,
          tipoCadastro: item.tipoCadastro || existing.tipoCadastro,
          tipoDocumento: item.tipoDocumento,
          documento: item.documento,
          status: item.status,
          situacaoEspecial: item.situacaoEspecial || null,
          observacaoOperacional: item.observacaoOperacional || null,
          contas: {
            create: (item.contas || []).map(contaData)
          }
        }
      });

      updated++;
    } else {
      await prisma.favorecido.create({
        data: {
          nome: item.nome,
          tipoCadastro: item.tipoCadastro || 'Outros',
          tipoDocumento: item.tipoDocumento,
          documento: item.documento,
          status: item.status,
          situacaoEspecial: item.situacaoEspecial || null,
          observacaoOperacional: item.observacaoOperacional || null,
          contas: {
            create: (item.contas || []).map(contaData)
          }
        }
      });

      inserted++;
    }
  }

  console.log(
    `Importação concluída. Inseridos: ${inserted}. Atualizados: ${updated}. Total processado: ${items.length}.`
  );
}

main()
  .catch((err) => {
    console.error('Erro na importação:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });