import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type ListFilters = {
  search?: string;
  tipo?: string;
  status?: string;
  onlyReview?: boolean;
  situacaoEspecial?: string;
};

type StatsResult = {
  Advogado: number;
  Associação: number;
  Perito: number;
  Outros: number;
};

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

@Injectable()
export class FavorecidosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ListFilters) {
    const search = filters.search?.trim() || '';
    const numericSearch = search.replace(/\D/g, '');

    const andFilters: Prisma.FavorecidoWhereInput[] = [];

    if (filters.tipo && filters.tipo !== 'Todos') {
      andFilters.push({ tipoCadastro: filters.tipo });
    }

    if (filters.status && filters.status !== 'Todos') {
      andFilters.push({ status: filters.status });
    }

    if (
      filters.situacaoEspecial &&
      filters.situacaoEspecial !== 'Todas'
    ) {
      andFilters.push({ situacaoEspecial: filters.situacaoEspecial });
    }

    if (filters.onlyReview) {
      andFilters.push({
        contas: {
          some: {
            statusValidacao: 'Pendente',
          },
        },
      });
    }

    if (!search) {
      return this.prisma.favorecido.findMany({
        where: andFilters.length > 0 ? { AND: andFilters } : {},
        include: { contas: true },
        orderBy: { nome: 'asc' },
      });
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

    const prismaExact = await this.prisma.favorecido.findMany({
      where: {
        AND: [...andFilters, { OR: searchOr }],
      },
      select: { id: true },
    });
    for (const item of prismaExact) {
      matchedIds.add(item.id);
    }

    try {
      const unaccentResults = await this.prisma.$queryRaw<Array<{ id: string }>>`
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
      const regexResults = await this.prisma.$queryRaw<Array<{ id: string }>>`
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
        const docResults = await this.prisma.$queryRaw<Array<{ id: string }>>`
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
      return [];
    }

    const finalFavorecidos = await this.prisma.favorecido.findMany({
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
    return finalFavorecidos;
  }

  async stats(): Promise<StatsResult> {
    const grouped = await this.prisma.favorecido.groupBy({
      by: ['tipoCadastro'],
      _count: {
        _all: true,
      },
    });

    const counters: StatsResult = {
      Advogado: 0,
      Associação: 0,
      Perito: 0,
      Outros: 0,
    };

    for (const row of grouped) {
      if (row.tipoCadastro === 'Advogado') {
        counters.Advogado = row._count._all;
      }

      if (row.tipoCadastro === 'Associação') {
        counters.Associação = row._count._all;
      }

      if (row.tipoCadastro === 'Perito') {
        counters.Perito = row._count._all;
      }

      if (row.tipoCadastro === 'Outros') {
        counters.Outros = row._count._all;
      }
    }

    return counters;
  }

  async create(body: any) {
    return this.prisma.favorecido.create({
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
  }

  async update(id: string, body: any) {
    return this.prisma.$transaction(async (tx) => {
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
  }

  async remove(id: string) {
    await this.prisma.contaBancaria.deleteMany({
      where: {
        favorecidoId: id,
      },
    });

    return this.prisma.favorecido.delete({
      where: {
        id,
      },
    });
  }
}