import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');
    const onlyReview = searchParams.get('onlyReview') === 'true';
    const situacaoEspecial = searchParams.get('situacaoEspecial');

    const numericSearch = search.replace(/\D/g, '');
    const and: Prisma.FavorecidoWhereInput[] = [];

    if (search) {
      const searchOr: Prisma.FavorecidoWhereInput[] = [
        {
          nome: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          documento: {
            contains: search,
          },
        },
        {
          contas: {
            some: {
              bancoNome: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          contas: {
            some: {
              agencia: {
                contains: search,
              },
            },
          },
        },
        {
          contas: {
            some: {
              conta: {
                contains: search,
              },
            },
          },
        },
        {
          contas: {
            some: {
              contaNumero: {
                contains: search,
              },
            },
          },
        },
        {
          contas: {
            some: {
              contaDigito: {
                contains: search,
              },
            },
          },
        },
        {
          contas: {
            some: {
              titularContaNome: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          contas: {
            some: {
              titularContaDocumento: {
                contains: search,
              },
            },
          },
        },
        {
          observacaoOperacional: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];

      and.push({
        OR: searchOr,
      });
    }

    if (tipo && tipo !== 'Todos') {
      and.push({
        tipoCadastro: tipo,
      });
    }

    if (status && status !== 'Todos') {
      and.push({
        status: status,
      });
    }

    if (situacaoEspecial && situacaoEspecial !== 'Todas') {
      and.push({
        situacaoEspecial: situacaoEspecial,
      });
    }

    if (onlyReview) {
      and.push({
        contas: {
          some: {
            statusValidacao: 'Pendente',
          },
        },
      });
    }

    const where: Prisma.FavorecidoWhereInput =
      and.length > 0
        ? {
            AND: and,
          }
        : {};

    const resultadosPadrao = await prisma.favorecido.findMany({
      where,
      include: {
        contas: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    if (!numericSearch) {
      return NextResponse.json(resultadosPadrao);
    }

    const documentosEncontrados = await prisma.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT id
      FROM favorecidos
      WHERE regexp_replace(documento, '\\D', '', 'g')
      LIKE ${`%${numericSearch}%`}
    `;

    const idsPorDocumentoNormalizado = documentosEncontrados.map(
      (registro) => registro.id,
    );

    if (!idsPorDocumentoNormalizado.length) {
      return NextResponse.json(resultadosPadrao);
    }

    const filtrosComplementares: Prisma.FavorecidoWhereInput[] = [];

    if (tipo && tipo !== 'Todos') {
      filtrosComplementares.push({
        tipoCadastro: tipo,
      });
    }

    if (status && status !== 'Todos') {
      filtrosComplementares.push({
        status: status,
      });
    }

    if (situacaoEspecial && situacaoEspecial !== 'Todas') {
      filtrosComplementares.push({
        situacaoEspecial: situacaoEspecial,
      });
    }

    if (onlyReview) {
      filtrosComplementares.push({
        contas: {
          some: {
            statusValidacao: 'Pendente',
          },
        },
      });
    }

    filtrosComplementares.push({
      id: {
        in: idsPorDocumentoNormalizado,
      },
    });

    const resultadosDocumentoNormalizado = await prisma.favorecido.findMany({
      where: {
        AND: filtrosComplementares,
      },
      include: {
        contas: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    const resultadosUnicos = new Map();

    for (const favorecido of resultadosPadrao) {
      resultadosUnicos.set(favorecido.id, favorecido);
    }

    for (const favorecido of resultadosDocumentoNormalizado) {
      resultadosUnicos.set(favorecido.id, favorecido);
    }

    const finalResult = [...resultadosUnicos.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error('Erro na rota GET /api/favorecidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar favorecidos' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const created = await prisma.favorecido.create({
      data: {
        nome: body.nome,
        tipoCadastro: body.tipoCadastro,
        tipoDocumento: body.tipoDocumento,
        documento: body.documento,
        status: body.status || 'Ativo',
        situacaoEspecial: body.situacaoEspecial || null,
        observacaoOperacional: body.observacaoOperacional || null,
        contas: {
          create: (body.contas || []).map((conta: any) => ({
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
        },
      },
      include: {
        contas: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Erro na rota POST /api/favorecidos:', error);
    return NextResponse.json(
      { error: 'Erro ao criar favorecido' },
      { status: 500 },
    );
  }
}
