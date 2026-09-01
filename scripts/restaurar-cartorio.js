require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nome = 'REGISTRO DE IMÓVEIS DA 3ª ZONA DE PORTO ALEGRE';

  const existente = await prisma.favorecido.findFirst({
    where: { nome },
    include: { contas: true }
  });

  if (!existente) {
    const criado = await prisma.favorecido.create({
      data: {
        nome,
        tipoDocumento: 'CNPJ',
        documento: '08.687.990/0001-90',
        status: 'Ativo',
        contas: {
          create: [{
            bancoNome: 'Caixa Econômica Federal',
            bancoCodigo: '104',
            agencia: '0448',
            operacaoProduto: '1292',
            conta: '000577316945-9',
            tipoConta: 'Corrente',
            contaPreferencial: false,
            titularConfirmado: true,
            statusValidacao: 'Validada',
            fonte: 'Restauração manual'
          }]
        }
      },
      include: { contas: true }
    });
    console.log('Registro recriado com sucesso:', criado.id);
    return;
  }

  await prisma.favorecido.update({
    where: { id: existente.id },
    data: {
      nome,
      tipoDocumento: 'CNPJ',
      documento: '08.687.990/0001-90',
      status: 'Ativo'
    }
  });

  if (existente.contas.length === 0) {
    await prisma.contaBancaria.create({
      data: {
        favorecidoId: existente.id,
        bancoNome: 'Caixa Econômica Federal',
        bancoCodigo: '104',
        agencia: '0448',
        operacaoProduto: '1292',
        conta: '000577316945-9',
        tipoConta: 'Corrente',
        contaPreferencial: false,
        titularConfirmado: true,
        statusValidacao: 'Validada',
        fonte: 'Restauração manual'
      }
    });
  } else {
    await prisma.contaBancaria.update({
      where: { id: existente.contas[0].id },
      data: {
        bancoNome: 'Caixa Econômica Federal',
        bancoCodigo: '104',
        agencia: '0448',
        operacaoProduto: '1292',
        conta: '000577316945-9',
        tipoConta: 'Corrente',
        titularConfirmado: true,
        statusValidacao: 'Validada',
        fonte: 'Restauração manual'
      }
    });
  }

  console.log('Registro restaurado com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
