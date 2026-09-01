CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS favorecidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('CPF','CNPJ')),
  documento VARCHAR(32) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Pendente validação','Revisar','Inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_favorecidos_documento_nome ON favorecidos (documento, nome);

CREATE TABLE IF NOT EXISTS contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  favorecido_id UUID NOT NULL REFERENCES favorecidos(id) ON DELETE CASCADE,
  banco_nome VARCHAR(120),
  banco_codigo VARCHAR(10),
  agencia VARCHAR(20),
  operacao_produto VARCHAR(20),
  conta VARCHAR(40),
  tipo_conta VARCHAR(30),
  conta_preferencial BOOLEAN NOT NULL DEFAULT false,
  titular_confirmado BOOLEAN NOT NULL DEFAULT false,
  status_validacao VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status_validacao IN ('Pendente','Validada','Revisar','Inativa')),
  fonte VARCHAR(100) DEFAULT 'Documento original',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_contas_favorecido ON contas_bancarias (favorecido_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('INSERT','UPDATE','DELETE')),
  actor_id VARCHAR(120),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_data JSONB,
  after_data JSONB,
  notes TEXT
);

CREATE OR REPLACE FUNCTION log_favorecidos_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_events(entity_type, entity_id, event_type, after_data)
    VALUES ('favorecido', NEW.id, TG_OP, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_events(entity_type, entity_id, event_type, before_data, after_data)
    VALUES ('favorecido', NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_events(entity_type, entity_id, event_type, before_data)
    VALUES ('favorecido', OLD.id, TG_OP, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_favorecidos_audit ON favorecidos;
CREATE TRIGGER trg_favorecidos_audit
AFTER INSERT OR UPDATE OR DELETE ON favorecidos
FOR EACH ROW EXECUTE FUNCTION log_favorecidos_changes();
