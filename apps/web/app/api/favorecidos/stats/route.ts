import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const grouped = await prisma.favorecido.groupBy({
      by: ['tipoCadastro'],
      _count: {
        _all: true,
      },
    });

    const counters = {
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

    return NextResponse.json(counters);
  } catch (error) {
    console.error('Erro na rota GET /api/favorecidos/stats:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar estatísticas' },
      { status: 500 },
    );
  }
}
