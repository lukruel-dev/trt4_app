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

@Injectable()
export class FavorecidosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: ListFilters) {
    const search = filters.search?.trim() || '';
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

    if (filters.tipo && filters.tipo !== 'Todos') {
      and.push({
        tipoCadastro: filters.tipo,
      });
    }

    if (filters.status && filters.status !== 'Todos') {
      and.push({
        status: filters.status,
      });
    }

    if (
      filters.situacaoEspecial &&
      filters.situacaoEspecial !== 'Todas'
    ) {
      and.push({
        situacaoEspecial: filters.situacaoEspecial,
      });
    }

    if (filters.onlyReview) {
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

    const resultadosPadrao = await this.prisma.favorecido.findMany({
      where,
      include: {
        contas: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    if (!numericSearch) {
      return resultadosPadrao;
    }

    const documentosEncontrados = await this.prisma.$queryRaw<
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
      return resultadosPadrao;
    }

    const filtrosComplementares: Prisma.FavorecidoWhereInput[] = [];

    if (filters.tipo && filters.tipo !== 'Todos') {
      filtrosComplementares.push({
        tipoCadastro: filters.tipo,
      });
    }

    if (filters.status && filters.status !== 'Todos') {
      filtrosComplementares.push({
        status: filters.status,
      });
    }

    if (
      filters.situacaoEspecial &&
      filters.situacaoEspecial !== 'Todas'
    ) {
      filtrosComplementares.push({
        situacaoEspecial: filters.situacaoEspecial,
      });
    }

    if (filters.onlyReview) {
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

    const resultadosDocumentoNormalizado =
      await this.prisma.favorecido.findMany({
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

    return [...resultadosUnicos.values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
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