const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Fetching banks from BrasilAPI (BACEN mirror)...');
  const response = await fetch('https://brasilapi.com.br/api/banks/v1');
  if (!response.ok) {
    throw new Error(`Failed to fetch banks: ${response.statusText}`);
  }
  const rawBanks = await response.json();
  console.log(`Fetched ${rawBanks.length} raw institutions.`);

  const popularAliases = {
    '001': 'Banco do Brasil BB',
    '041': 'Banrisul Banco do Estado do Rio Grande do Sul',
    '104': 'Caixa Economica Federal CEF Caixa',
    '237': 'Bradesco',
    '341': 'Itau Itaú Unibanco',
    '033': 'Santander',
    '260': 'Nubank Nu Pagamentos Nu Bank',
    '077': 'Banco Inter Intermedium',
    '336': 'C6 Bank C6Bank',
    '756': 'Sicoob Bancoob',
    '748': 'Sicredi',
    '290': 'PagBank PagSeguro',
    '380': 'PicPay PicPay Bank',
    '323': 'Mercado Pago',
    '422': 'Banco Safra',
    '655': 'Banco Neon',
    '212': 'Banco Original',
    '070': 'BRB Banco de Brasilia',
    '085': 'Ailos Viacredi',
    '136': 'Unicred',
  };

  const cleanBanks = rawBanks
    .filter(b => b.code !== null && b.name)
    .map(b => {
      const codeStr = String(b.code).padStart(3, '0');
      const alias = popularAliases[codeStr] || '';
      return {
        code: codeStr,
        name: b.name.trim(),
        fullName: (b.fullName || b.name).trim(),
        ispb: b.ispb || '',
        alias,
      };
    })
    .sort((a, b) => {
      // Prioritize top common banks, with Banrisul (041) prioritized for TRT4 (RS)
      const topPriority = ['001', '041', '104', '237', '341', '033', '260', '077', '748', '756'];
      const indexA = topPriority.indexOf(a.code);
      const indexB = topPriority.indexOf(b.code);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.code.localeCompare(b.code);
    });

  const targetDir = path.join(__dirname, '..', 'apps', 'web', 'data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetFile = path.join(targetDir, 'bancos.json');
  fs.writeFileSync(targetFile, JSON.stringify(cleanBanks, null, 2), 'utf-8');
  console.log(`Successfully written ${cleanBanks.length} banks to ${targetFile}`);
}

main().catch(err => {
  console.error('Error generating bancos.json:', err);
  process.exit(1);
});
