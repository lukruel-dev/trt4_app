export function cleanDigits(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 * Funciona de forma progressiva conforme digitação.
 */
export function maskCpf(value?: string | null): string {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0001-00
 * Funciona de forma progressiva conforme digitação.
 */
export function maskCnpj(value?: string | null): string {
  const digits = cleanDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formata CPF ou CNPJ de acordo com o tipo especificado.
 */
export function maskDocumento(
  value?: string | null,
  tipo: string = 'CPF',
): string {
  if (!value) return '';
  return tipo === 'CNPJ' ? maskCnpj(value) : maskCpf(value);
}

/**
 * Validação do algoritmo oficial da Receita Federal para CPF.
 */
export function validateCpf(cpf?: string | null): boolean {
  const digits = cleanDigits(cpf);
  if (digits.length !== 11) return false;

  // Rejeita sequências de dígitos idênticos (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[9], 10)) return false;

  // 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits[10], 10)) return false;

  return true;
}

/**
 * Validação do algoritmo oficial da Receita Federal para CNPJ.
 */
export function validateCnpj(cnpj?: string | null): boolean {
  const digits = cleanDigits(cnpj);
  if (digits.length !== 14) return false;

  // Rejeita sequências de dígitos idênticos
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // 1º dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += parseInt(digits[i], 10) * weights1[i];
  }
  const rem1 = sum1 % 11;
  const d1 = rem1 < 2 ? 0 : 11 - rem1;
  if (d1 !== parseInt(digits[12], 10)) return false;

  // 2º dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += parseInt(digits[i], 10) * weights2[i];
  }
  const rem2 = sum2 % 11;
  const d2 = rem2 < 2 ? 0 : 11 - rem2;
  if (d2 !== parseInt(digits[13], 10)) return false;

  return true;
}

export type DocumentValidationStatus =
  | 'empty'
  | 'incomplete'
  | 'valid'
  | 'invalid';

export type DocumentValidationResult = {
  isValid: boolean;
  status: DocumentValidationStatus;
  message: string;
};

/**
 * Avalia o status e mensagem de validação do documento para exibição na interface.
 */
export function getDocumentoValidation(
  value?: string | null,
  tipo: string = 'CPF',
): DocumentValidationResult {
  const digits = cleanDigits(value);
  const isCnpj = tipo === 'CNPJ';
  const expectedLength = isCnpj ? 14 : 11;

  if (digits.length === 0) {
    return {
      isValid: false,
      status: 'empty',
      message: `Informe o ${tipo}`,
    };
  }

  if (digits.length < expectedLength) {
    return {
      isValid: false,
      status: 'incomplete',
      message: `${tipo} incompleto (${digits.length}/${expectedLength} dígitos)`,
    };
  }

  const isValid = isCnpj ? validateCnpj(value) : validateCpf(value);

  if (isValid) {
    return {
      isValid: true,
      status: 'valid',
      message: `${tipo} válido`,
    };
  }

  return {
    isValid: false,
    status: 'invalid',
    message: `${tipo} inválido (verifique os números)`,
  };
}

/**
 * Normaliza o tipo de conta para 'Conta Corrente' ou 'Conta Poupança'.
 */
export function normalizeTipoConta(tipo?: string | null): string {
  if (!tipo) return 'Conta Corrente';
  const trimmed = tipo.trim();
  if (trimmed === 'Corrente' || trimmed === 'Conta Corrente') {
    return 'Conta Corrente';
  }
  if (
    trimmed === 'Poupança' ||
    trimmed === 'Conta Poupança' ||
    trimmed === 'Poupanca' ||
    trimmed === 'Conta Poupanca'
  ) {
    return 'Conta Poupança';
  }
  return trimmed;
}

