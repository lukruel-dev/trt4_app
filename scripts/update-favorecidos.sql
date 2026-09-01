ALTER TABLE favorecidos
  ADD COLUMN IF NOT EXISTS situacao_especial varchar(40),
  ADD COLUMN IF NOT EXISTS observacao_operacional varchar(500);

ALTER TABLE contas_bancarias
  ADD COLUMN IF NOT EXISTS titular_conta_nome varchar(255),
  ADD COLUMN IF NOT EXISTS titular_conta_documento varchar(32),
  ADD COLUMN IF NOT EXISTS titular_tipo_documento varchar(10),
  ADD COLUMN IF NOT EXISTS conta varchar(40);