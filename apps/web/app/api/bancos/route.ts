import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export interface BancoItem {
  code: string;
  name: string;
  fullName: string;
  ispb: string;
  alias?: string;
}

let cachedBancos: BancoItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function removeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function loadLocalBancos(): BancoItem[] {
  const candidatePaths = [
    path.join(process.cwd(), 'data', 'bancos.json'),
    path.join(process.cwd(), 'apps', 'web', 'data', 'bancos.json'),
    path.join(__dirname, '..', '..', '..', 'data', 'bancos.json'),
    path.join(__dirname, '..', '..', '..', '..', 'data', 'bancos.json'),
  ];

  for (const filePath of candidatePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return [];
}

async function getBancos(): Promise<BancoItem[]> {
  const now = Date.now();
  if (cachedBancos && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedBancos;
  }

  // First try to serve immediately from local snapshot
  if (!cachedBancos) {
    const local = loadLocalBancos();
    if (local.length > 0) {
      cachedBancos = local;
      lastFetchTime = now;
    }
  }

  // In background, refresh from BrasilAPI (BACEN mirror)
  try {
    const res = await fetch('https://brasilapi.com.br/api/banks/v1', {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const raw = await res.json();
      if (Array.isArray(raw) && raw.length > 0) {
        const topPriority = ['001', '104', '237', '341', '033', '260', '077', '756', '748'];
        const formatted: BancoItem[] = raw
          .filter((b: any) => b.code !== null && b.name)
          .map((b: any) => ({
            code: String(b.code).padStart(3, '0'),
            name: String(b.name).trim(),
            fullName: String(b.fullName || b.name).trim(),
            ispb: String(b.ispb || ''),
          }))
          .sort((a, b) => {
            const indexA = topPriority.indexOf(a.code);
            const indexB = topPriority.indexOf(b.code);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.code.localeCompare(b.code);
          });

        cachedBancos = formatted;
        lastFetchTime = now;
      }
    }
  } catch (fetchErr) {
    console.warn('Não foi possível atualizar bancos via BrasilAPI, mantendo base local:', fetchErr);
  }

  return cachedBancos || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';

    const allBancos = await getBancos();

    if (!search) {
      return NextResponse.json(allBancos);
    }

    const cleanSearch = removeAccents(search);
    const isNumeric = /^\d+$/.test(cleanSearch);

    const filtered = allBancos.filter((banco) => {
      if (isNumeric) {
        return banco.code.includes(cleanSearch);
      }
      const normName = removeAccents(banco.name);
      const normFullName = removeAccents(banco.fullName);
      const normAlias = removeAccents(banco.alias || '');
      return (
        banco.code.includes(cleanSearch) ||
        normName.includes(cleanSearch) ||
        normFullName.includes(cleanSearch) ||
        normAlias.includes(cleanSearch)
      );
    });

    return NextResponse.json(filtered.slice(0, 50));
  } catch (error) {
    console.error('Erro na rota GET /api/bancos:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar lista de bancos' },
      { status: 500 },
    );
  }
}
