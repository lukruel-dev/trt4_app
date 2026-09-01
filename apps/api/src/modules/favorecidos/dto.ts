import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const TIPOS_CADASTRO = ['Advogado', 'Associação', 'Perito', 'Outros'] as const;

const STATUS_FAVORECIDO = [
  'Ativo',
  'Pendente validação',
  'Revisar',
  'Inativo',
] as const;

const STATUS_VALIDACAO_CONTA = [
  'Pendente',
  'Validada',
  'Revisar',
  'Inativa',
] as const;

const SITUACOES_ESPECIAIS = [
  'SUCESSAO',
  'INVENTARIANTE',
  'ALVARA_TERCEIRO',
  'ESPOLIO',
] as const;

const TIPOS_DOCUMENTO = ['CPF', 'CNPJ'] as const;

export class ContaDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  bancoNome?: string;

  @IsOptional()
  @IsString()
  bancoCodigo?: string;

  @IsOptional()
  @IsString()
  agencia?: string;

  @IsOptional()
  @IsString()
  operacaoProduto?: string;

  @IsOptional()
  @IsString()
  conta?: string;

  @IsOptional()
  @IsString()
  contaNumero?: string;

  @IsOptional()
  @IsString()
  contaDigito?: string;

  @IsOptional()
  @IsString()
  tipoConta?: string;

  @IsOptional()
  @IsBoolean()
  contaPreferencial?: boolean;

  @IsOptional()
  @IsBoolean()
  titularConfirmado?: boolean;

  @IsOptional()
  @IsString()
  titularContaNome?: string;

  @IsOptional()
  @IsString()
  titularContaDocumento?: string;

  @IsOptional()
  @IsIn(TIPOS_DOCUMENTO)
  titularTipoDocumento?: string;

  @IsOptional()
  @IsIn(STATUS_VALIDACAO_CONTA)
  statusValidacao?: string;

  @IsOptional()
  @IsString()
  fonte?: string;
}

export class UpsertFavorecidoDto {
  @IsString()
  nome!: string;

  @IsOptional()
  @IsIn(TIPOS_CADASTRO)
  tipoCadastro?: string;

  @IsIn(TIPOS_DOCUMENTO)
  tipoDocumento!: string;

  @IsString()
  documento!: string;

  @IsIn(STATUS_FAVORECIDO)
  status!: string;

  @IsOptional()
  @IsIn(SITUACOES_ESPECIAIS)
  situacaoEspecial?: string;

  @IsOptional()
  @IsString()
  observacaoOperacional?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContaDto)
  contas!: ContaDto[];
}