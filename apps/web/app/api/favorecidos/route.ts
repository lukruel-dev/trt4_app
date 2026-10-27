import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function buildAccentInsensitiveRegex(term: string): string {
  const accentMap: Record<string, string> = {
    a: '[aàáâãäåā]',
    e: '[eèéêëē]',
    i: '[iìíîïī]',
    o: '[oòóôõöøō]',
    u: '[uùúûüū]',
    c: '[cç]',
    n: '[nñ]',
    y: '[yýÿ]',
  };
  const normalized = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  let regex = '';
  for (const char of normalized) {
    if (accentMap[char]) {
      regex += accentMap[char];
    } else if (/[.*+?^${}()|[\]\\]/.test(char)) {
      regex += '\\' + char;
    } else {
      regex += char;
    }
  }
  return regex;
}

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

    const andFilters: Prisma.FavorecidoWhereInput[] = [];

    if (tipo && tipo !== 'Todos') {
      andFilters.push({ tipoCadastro: tipo });
    }

    if (status && status !== 'Todos') {
      andFilters.push({ status: status });
    }

    if (situacaoEspecial && situacaoEspecial !== 'Todas') {
      andFilters.push({ situacaoEspecial: situacaoEspecial });
    }

    if (onlyReview) {
      andFilters.push({
        contas: {
          some: {
            statusValidacao: 'Pendente',
          },
        },
      });
    }

    if (!search) {
      const results = await prisma.favorecido.findMany({
        where: andFilters.length > 0 ? { AND: andFilters } : {},
        include: { contas: true },
        orderBy: { nome: 'asc' },
      });
      return NextResponse.json(results);
    }

    const matchedIds = new Set<string>();

    const searchOr: Prisma.FavorecidoWhereInput[] = [
      { nome: { contains: search, mode: 'insensitive' } },
      { documento: { contains: search } },
      { contas: { some: { bancoNome: { contains: search, mode: 'insensitive' } } } },
      { contas: { some: { agencia: { contains: search } } } },
      { contas: { some: { conta: { contains: search } } } },
      { contas: { some: { contaNumero: { contains: search } } } },
      { contas: { some: { contaDigito: { contains: search } } } },
      { contas: { some: { titularContaNome: { contains: search, mode: 'insensitive' } } } },
      { contas: { some: { titularContaDocumento: { contains: search } } } },
      { observacaoOperacional: { contains: search, mode: 'insensitive' } },
    ];

    const prismaExact = await prisma.favorecido.findMany({
      where: {
        AND: [...andFilters, { OR: searchOr }],
      },
      select: { id: true },
    });
    for (const item of prismaExact) {
      matchedIds.add(item.id);
    }

    try {
      const unaccentResults = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT f.id
        FROM favorecidos f
        LEFT JOIN contas_bancarias c ON c.favorecido_id = f.id
        WHERE
          unaccent(f.nome) ILIKE unaccent(${`%${search}%`})
          OR unaccent(COALESCE(c.banco_nome, '')) ILIKE unaccent(${`%${search}%`})
          OR unaccent(COALESCE(c.titular_conta_nome, '')) ILIKE unaccent(${`%${search}%`})
          OR unaccent(COALESCE(f.observacao_operacional, '')) ILIKE unaccent(${`%${search}%`})
      `;
      for (const item of unaccentResults) {
        matchedIds.add(item.id);
      }
    } catch {
      const regexPattern = buildAccentInsensitiveRegex(search);
      const regexResults = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT DISTINCT f.id
        FROM favorecidos f
        LEFT JOIN contas_bancarias c ON c.favorecido_id = f.id
        WHERE
          f.nome ~* ${regexPattern}
          OR COALESCE(c.banco_nome, '') ~* ${regexPattern}
          OR COALESCE(c.titular_conta_nome, '') ~* ${regexPattern}
          OR COALESCE(f.observacao_operacional, '') ~* ${regexPattern}
      `;
      for (const item of regexResults) {
        matchedIds.add(item.id);
      }
    }

    if (numericSearch) {
      try {
        const docResults = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT DISTINCT f.id
          FROM favorecidos f
          LEFT JOIN contas_bancarias c ON c.favorecido_id = f.id
          WHERE
            regexp_replace(f.documento, '\\D', '', 'g') LIKE ${`%${numericSearch}%`}
            OR regexp_replace(COALESCE(c.titular_conta_documento, ''), '\\D', '', 'g') LIKE ${`%${numericSearch}%`}
        `;
        for (const item of docResults) {
          matchedIds.add(item.id);
        }
      } catch (err) {
        console.error('Erro ao buscar documento por regex numérica:', err);
      }
    }

    if (matchedIds.size === 0) {
      return NextResponse.json([]);
    }

    const finalFavorecidos = await prisma.favorecido.findMany({
      where: {
        AND: [
          ...andFilters,
          {
            id: {
              in: Array.from(matchedIds),
            },
          },
        ],
      },
      include: {
        contas: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    finalFavorecidos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return NextResponse.json(finalFavorecidos);
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
          create: (body.contas || []).map((conta: any) => {
            let numConta = (conta.conta || conta.contaNumero || '').trim();
            let digito = (conta.contaDigito || '').trim();

            if (numConta.includes('-')) {
              const parts = numConta.split('-');
              numConta = parts[0].trim();
              if (!digito && parts[1]) {
                digito = parts[1].trim();
              }
            }

            return {
              bancoNome: conta.bancoNome || null,
              bancoCodigo: conta.bancoCodigo || null,
              agencia: conta.agencia || null,
              operacaoProduto: conta.operacaoProduto || null,
              conta: numConta || null,
              contaNumero: numConta || null,
              contaDigito: digito || null,
              tipoConta: conta.tipoConta || null,
              contaPreferencial: !!conta.contaPreferencial,
              titularConfirmado: !!conta.titularConfirmado,
              titularContaNome: conta.titularContaNome || null,
              titularContaDocumento: conta.titularContaDocumento || null,
              titularTipoDocumento: conta.titularTipoDocumento || null,
              statusValidacao: conta.statusValidacao || 'Pendente',
              fonte: conta.fonte || 'Cadastro manual',
            };
          }),
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
