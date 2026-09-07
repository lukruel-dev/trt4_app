import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.favorecido.update({
        where: {
          id,
        },
        data: {
          nome: body.nome,
          tipoCadastro: body.tipoCadastro,
          tipoDocumento: body.tipoDocumento,
          documento: body.documento,
          status: body.status,
          situacaoEspecial: body.situacaoEspecial ?? null,
          observacaoOperacional: body.observacaoOperacional ?? null,
        },
      });

      const atuais = await tx.contaBancaria.findMany({
        where: {
          favorecidoId: id,
        },
      });

      const recebidas = Array.isArray(body.contas) ? body.contas : [];
      const recebidasComId = recebidas.filter((conta: any) => conta.id);
      const idsMantidos = new Set(
        recebidasComId.map((conta: any) => conta.id),
      );

      for (const contaAtual of atuais) {
        const nova = recebidasComId.find(
          (conta: any) => conta.id === contaAtual.id,
        );

        if (!nova) {
          continue;
        }

        await tx.contaBancaria.update({
          where: {
            id: contaAtual.id,
          },
          data: {
            bancoNome: nova.bancoNome ?? contaAtual.bancoNome,
            bancoCodigo: nova.bancoCodigo ?? contaAtual.bancoCodigo,
            agencia: nova.agencia ?? contaAtual.agencia,
            operacaoProduto:
              nova.operacaoProduto ?? contaAtual.operacaoProduto,
            conta: nova.conta ?? contaAtual.conta,
            contaNumero: nova.contaNumero ?? contaAtual.contaNumero,
            contaDigito: nova.contaDigito ?? contaAtual.contaDigito,
            tipoConta: nova.tipoConta ?? contaAtual.tipoConta,
            contaPreferencial:
              typeof nova.contaPreferencial === 'boolean'
                ? nova.contaPreferencial
                : contaAtual.contaPreferencial,
            titularConfirmado:
              typeof nova.titularConfirmado === 'boolean'
                ? nova.titularConfirmado
                : contaAtual.titularConfirmado,
            titularContaNome:
              nova.titularContaNome ?? contaAtual.titularContaNome,
            titularContaDocumento:
              nova.titularContaDocumento ?? contaAtual.titularContaDocumento,
            titularTipoDocumento:
              nova.titularTipoDocumento ?? contaAtual.titularTipoDocumento,
            statusValidacao:
              nova.statusValidacao ?? contaAtual.statusValidacao,
            fonte: nova.fonte ?? contaAtual.fonte,
          },
        });
      }

      const novasSemId = recebidas.filter((conta: any) => !conta.id);

      if (novasSemId.length) {
        await tx.contaBancaria.createMany({
          data: novasSemId.map((conta: any) => ({
            favorecidoId: id,
            bancoNome: conta.bancoNome || null,
            bancoCodigo: conta.bancoCodigo || null,
            agencia: conta.agencia || null,
            operacaoProduto: conta.operacaoProduto || null,
            conta: conta.conta || null,
            contaNumero: conta.contaNumero || null,
            contaDigito: conta.contaDigito || null,
            tipoConta: conta.tipoConta || null,
            contaPreferencial: !!conta.contaPreferencial,
            titularConfirmado: !!conta.titularConfirmado,
            titularContaNome: conta.titularContaNome || null,
            titularContaDocumento: conta.titularContaDocumento || null,
            titularTipoDocumento: conta.titularTipoDocumento || null,
            statusValidacao: conta.statusValidacao || 'Pendente',
            fonte: conta.fonte || 'Cadastro manual',
          })),
        });
      }

      const idsAtuais = new Set(atuais.map((conta) => conta.id));
      const idsExcluir = [...idsAtuais].filter(
        (idConta) => !idsMantidos.has(idConta),
      );

      if (idsExcluir.length) {
        await tx.contaBancaria.deleteMany({
          where: {
            id: {
              in: idsExcluir,
            },
          },
        });
      }

      return tx.favorecido.findUnique({
        where: {
          id,
        },
        include: {
          contas: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro na rota PATCH /api/favorecidos/[id]:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar favorecido' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.contaBancaria.deleteMany({
      where: {
        favorecidoId: id,
      },
    });

    const deleted = await prisma.favorecido.delete({
      where: {
        id,
      },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    console.error('Erro na rota DELETE /api/favorecidos/[id]:', error);
    return NextResponse.json(
      { error: 'Erro ao remover favorecido' },
      { status: 500 },
    );
  }
}
