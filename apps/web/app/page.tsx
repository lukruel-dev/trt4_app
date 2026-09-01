'use client';

import { CSSProperties, ReactNode, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const tipos = ['Todos', 'Advogado', 'Associação', 'Perito', 'Outros'] as const;
const situacoesEspeciais = [
  '',
  'SUCESSAO',
  'INVENTARIANTE',
  'ALVARA_TERCEIRO',
  'ESPOLIO',
] as const;

type Theme = 'light' | 'dark';
type TipoCadastro = (typeof tipos)[number];
type Counters = Record<TipoCadastro, number>;

const emptyConta = {
  id: '',
  bancoNome: '',
  bancoCodigo: '',
  agencia: '',
  operacaoProduto: '',
  conta: '',
  contaNumero: '',
  contaDigito: '',
  tipoConta: '',
  contaPreferencial: false,
  titularConfirmado: false,
  titularContaNome: '',
  titularContaDocumento: '',
  titularTipoDocumento: 'CPF',
  statusValidacao: 'Pendente',
  fonte: 'Cadastro manual',
};

const emptyForm = {
  id: '',
  nome: '',
  tipoCadastro: 'Advogado',
  tipoDocumento: 'CPF',
  documento: '',
  status: 'Ativo',
  situacaoEspecial: '',
  observacaoOperacional: '',
  contas: [{ ...emptyConta }],
};

const emptyCounters: Counters = {
  Todos: 0,
  Advogado: 0,
  Associação: 0,
  Perito: 0,
  Outros: 0,
};

function normalizeConta(conta: any = {}) {
  return {
    id: conta.id ?? '',
    bancoNome: conta.bancoNome ?? '',
    bancoCodigo: conta.bancoCodigo ?? '',
    agencia: conta.agencia ?? '',
    operacaoProduto: conta.operacaoProduto ?? '',
    conta: conta.conta ?? '',
    contaNumero: conta.contaNumero ?? '',
    contaDigito: conta.contaDigito ?? '',
    tipoConta: conta.tipoConta ?? '',
    contaPreferencial: !!conta.contaPreferencial,
    titularConfirmado: !!conta.titularConfirmado,
    titularContaNome: conta.titularContaNome ?? '',
    titularContaDocumento: conta.titularContaDocumento ?? '',
    titularTipoDocumento: conta.titularTipoDocumento ?? 'CPF',
    statusValidacao: conta.statusValidacao ?? 'Pendente',
    fonte: conta.fonte ?? 'Cadastro manual',
  };
}

function normalizeForm(item: any) {
  return {
    id: item.id ?? '',
    nome: item.nome ?? '',
    tipoCadastro: item.tipoCadastro || 'Advogado',
    tipoDocumento: item.tipoDocumento || 'CPF',
    documento: item.documento ?? '',
    status: item.status || 'Ativo',
    situacaoEspecial: item.situacaoEspecial ?? '',
    observacaoOperacional: item.observacaoOperacional ?? '',
    contas: item.contas?.length
      ? item.contas.map((conta: any) => normalizeConta(conta))
      : [{ ...emptyConta }],
  };
}

function buildPayload(form: any) {
  return {
    ...form,
    situacaoEspecial: form.situacaoEspecial || null,
    observacaoOperacional: form.observacaoOperacional?.trim() || null,
    contas: (form.contas || []).map((conta: any) => ({
      ...conta,
      conta: conta.conta?.trim() || null,
      contaNumero: conta.contaNumero?.trim() || null,
      contaDigito: conta.contaDigito?.trim() || null,
      titularContaNome: conta.titularContaNome?.trim() || null,
      titularContaDocumento: conta.titularContaDocumento?.trim() || null,
      titularTipoDocumento: conta.titularContaDocumento
        ? conta.titularTipoDocumento || 'CPF'
        : null,
    })),
  };
}

function formatSituacaoEspecial(value?: string) {
  if (!value) return '—';

  switch (value) {
    case 'SUCESSAO':
      return 'Sucessão';
    case 'INVENTARIANTE':
      return 'Inventariante';
    case 'ALVARA_TERCEIRO':
      return 'Alvará a terceiro';
    case 'ESPOLIO':
      return 'Espólio';
    default:
      return value;
  }
}

function getBadgeText(item: any) {
  return item.situacaoEspecial
    ? formatSituacaoEspecial(item.situacaoEspecial)
    : item.status;
}

function getContaApresentacao(conta: any) {
  return conta.conta || conta.contaNumero || '—';
}

function shouldShowTitularFields(form: any) {
  return !!form.situacaoEspecial;
}

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<typeof tipos[number]>('Todos');
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [counters, setCounters] = useState<Counters>(emptyCounters);

  const colors = theme === 'dark' ? darkColors : lightColors;
  const styles = makeStyles(colors);

  async function load(options?: {
    search?: string;
    tipo?: string;
    preserveSelection?: boolean;
  }) {
    const searchValue = options?.search ?? search;
    const tipoValue = options?.tipo ?? tipo;

    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }

      if (tipoValue) {
        params.set('tipo', tipoValue);
      }

      const response = await fetch(
        `${API_URL}/favorecidos?${params.toString()}`,
      );

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`API respondeu ${response.status}: ${responseText}`);
      }

      const data = responseText ? JSON.parse(responseText) : [];

      setItems(data);

      setSelected((currentSelected: any | null) => {
        if (options?.preserveSelection && currentSelected) {
          const stillExists = data.find(
            (item: any) => item.id === currentSelected.id,
          );

          if (stillExists) {
            return stillExists;
          }
        }

        return data.length ? data[0] : null;
      });
    } catch (error) {
      console.error('Erro ao carregar favorecidos:', error);
      setItems([]);
      setSelected(null);
      alert(
        error instanceof Error
          ? `Erro ao carregar registros: ${error.message}`
          : 'Erro ao carregar registros.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCounters() {
    try {
      const response = await fetch(`${API_URL}/favorecidos/stats`);
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`API respondeu ${response.status}: ${responseText}`);
      }

      const data = responseText ? JSON.parse(responseText) : emptyCounters;

      setCounters({
        Todos:
          Number(data.Advogado || 0) +
          Number(data.Associação || 0) +
          Number(data.Perito || 0) +
          Number(data.Outros || 0),
        Advogado: Number(data.Advogado || 0),
        Associação: Number(data.Associação || 0),
        Perito: Number(data.Perito || 0),
        Outros: Number(data.Outros || 0),
      });
    } catch (error) {
      console.error('Erro ao carregar contadores:', error);
      setCounters(emptyCounters);
    }
  }

  useEffect(() => {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;

    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    load({
      tipo,
      preserveSelection: true,
    });
  }, [tipo]);

  useEffect(() => {
    loadCounters();
  }, []);

  function openNew() {
    setForm({
      ...emptyForm,
      tipoCadastro: tipo,
      tipoDocumento: tipo === 'Associação' ? 'CNPJ' : 'CPF',
      contas: [{ ...emptyConta }],
    });

    setOpen(true);
  }

  function openEdit(item: any) {
    setForm(normalizeForm(item));
    setOpen(true);
  }

  function openAddConta(item: any) {
    const normalized = normalizeForm(item);

    setForm({
      ...normalized,
      contas: [
        ...normalized.contas,
        {
          ...emptyConta,
          fonte: 'Conta incluída manualmente',
        },
      ],
    });

    setOpen(true);
  }

  function updateConta(index: number, field: string, value: any) {
    setForm((previous: any) => {
      const contas = [...previous.contas];
      contas[index] = {
        ...contas[index],
        [field]: value,
      };

      return {
        ...previous,
        contas,
      };
    });
  }

  function addConta() {
    setForm((previous: any) => ({
      ...previous,
      contas: [
        ...previous.contas,
        {
          ...emptyConta,
        },
      ],
    }));
  }

  function removeConta(index: number) {
    setForm((previous: any) => ({
      ...previous,
      contas: previous.contas.filter(
        (_: any, contaIndex: number) => contaIndex !== index,
      ),
    }));
  }

  async function save() {
    const method = form.id ? 'PATCH' : 'POST';
    const url = form.id
      ? `${API_URL}/favorecidos/${form.id}`
      : `${API_URL}/favorecidos`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildPayload(form)),
      });

      if (!response.ok) {
        throw new Error('Não foi possível salvar o registro.');
      }

      const data = await response.json();

      setOpen(false);
      setForm(emptyForm);

      await Promise.all([
        load({
          search,
          tipo,
        }),
        loadCounters(),
      ]);

      setSelected(data);
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar o registro.');
    }
  }

  async function removeRegistro(id: string) {
    if (!confirm('Excluir este registro?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/favorecidos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Não foi possível excluir o registro.');
      }

      await Promise.all([
        load({
          search,
          tipo,
        }),
        loadCounters(),
      ]);
    } catch (error) {
      console.error(error);
      alert('Não foi possível excluir o registro.');
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text || '');
      alert(`${label} copiado.`);
    } catch {
      alert(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  }

  async function clearSearch() {
    setSearch('');

    await load({
      search: '',
      tipo,
    });
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'light' ? 'dark' : 'light',
    );
  }

  return (
    <main style={styles.app}>
      <style>{responsiveCss}</style>

      <header style={styles.header} className="header">
        <div>
          <div style={styles.eyebrow}>Justiça do Trabalho</div>
          <h1 style={styles.title}>Consulta de dados bancários</h1>
          <p style={styles.subtitle}>
            Advogados, associações, peritos e outros com busca por CPF/CNPJ,
            múltiplas contas vinculadas e destaque para situações especiais.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={toggleTheme}
            style={styles.ghostBtn}
            aria-label={
              theme === 'light'
                ? 'Ativar modo escuro'
                : 'Ativar modo claro'
            }
            title={
              theme === 'light'
                ? 'Ativar modo escuro'
                : 'Ativar modo claro'
            }
          >
            {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          </button>

          <button
            type="button"
            onClick={() => load({ search, tipo, preserveSelection: true })}
            style={styles.ghostBtn}
          >
            Atualizar
          </button>

          <button type="button" onClick={openNew} style={styles.primaryBtn}>
            Incluir registro
          </button>
        </div>
      </header>

      <section style={styles.tabsWrap} aria-label="Tipos de cadastro">
        {tipos.map((tipoItem) => (
          <button
            key={tipoItem}
            type="button"
            onClick={() => setTipo(tipoItem)}
            style={tipo === tipoItem ? styles.tabActive : styles.tabButton}
          >
            {tipoItem}
            <span style={styles.tabCount}>{counters[tipoItem] || 0}</span>
          </button>
        ))}
      </section>

      <section style={styles.searchPanel}>
        <div style={styles.searchGrid} className="search-grid">
          <div>
            <label htmlFor="search" style={styles.label}>
              Pesquisar por nome, CPF/CNPJ, observação ou titular da conta
            </label>

            <input
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  load({
                    search,
                    tipo,
                  });
                }
              }}
              placeholder="Ex.: nome do falecido, sucessor, CPF ou CNPJ"
              style={styles.input}
            />
          </div>

          <div style={styles.searchActions}>
            <button
              type="button"
              onClick={() => load({ search, tipo })}
              style={styles.primaryBtn}
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={clearSearch}
              style={styles.ghostBtn}
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      <section style={styles.contentGrid} className="content-grid">
        <aside style={styles.listPanel}>
          <div style={styles.panelHeader}>
            <h2 style={styles.sectionTitle}>Resultados</h2>
            <span style={styles.metaBadge}>{items.length} registros</span>
          </div>

          {loading ? (
            <p style={styles.mutedText}>Carregando...</p>
          ) : items.length === 0 ? (
            <p style={styles.mutedText}>Nenhum registro encontrado.</p>
          ) : (
            <div style={styles.resultList}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  style={
                    selected?.id === item.id
                      ? styles.resultCardActive
                      : styles.resultCard
                  }
                >
                  <div style={styles.resultCardContent}>
                    <div>
                      <div style={styles.resultName}>{item.nome}</div>
                      <div style={styles.resultDocument}>
                        {item.tipoDocumento} {item.documento || 'Não informado'}
                      </div>

                      {item.situacaoEspecial ? (
                        <div style={styles.specialBadgeRow}>
                          <span style={styles.specialBadge}>
                            {formatSituacaoEspecial(item.situacaoEspecial)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <span
                      style={
                        item.situacaoEspecial
                          ? styles.specialMiniTag
                          : styles.miniTag
                      }
                    >
                      {getBadgeText(item)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section style={styles.detailPanel}>
          {!selected ? (
            <div style={styles.emptyState}>
              Selecione um registro para visualizar os dados.
            </div>
          ) : (
            <>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.eyebrow}>Detalhe do registro</div>
                  <h2 style={styles.detailTitle}>{selected.nome}</h2>
                </div>

                <div style={styles.detailActions}>
                  <button
                    type="button"
                    onClick={() => openAddConta(selected)}
                    style={styles.ghostBtn}
                  >
                    Incluir conta
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    style={styles.ghostBtn}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRegistro(selected.id)}
                    style={styles.dangerBtn}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {selected.situacaoEspecial ? (
                <div style={styles.highlightBox}>
                  <div style={styles.highlightLabel}>Selo destacado</div>
                  <div style={styles.highlightValue}>
                    {formatSituacaoEspecial(selected.situacaoEspecial)}
                  </div>
                  {selected.observacaoOperacional ? (
                    <div style={styles.highlightNote}>
                      {selected.observacaoOperacional}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={styles.detailGrid} className="detail-grid">
                <InfoField
                  label="Tipo"
                  value={selected.tipoCadastro || '—'}
                  styles={styles}
                />
                <InfoField
                  label="Status"
                  value={selected.status || '—'}
                  styles={styles}
                />
                <InfoField
                  label="Situação especial"
                  value={formatSituacaoEspecial(selected.situacaoEspecial)}
                  styles={styles}
                />
                <InfoField
                  label="Observação operacional"
                  value={selected.observacaoOperacional || '—'}
                  styles={styles}
                />
                <CopyField
                  label={selected.tipoDocumento || 'Documento'}
                  value={selected.documento || '—'}
                  onCopy={() =>
                    copy(
                      selected.documento || '',
                      selected.tipoDocumento || 'Documento',
                    )
                  }
                  styles={styles}
                />
                <CopyField
                  label="Nome"
                  value={selected.nome || '—'}
                  onCopy={() => copy(selected.nome || '', 'Nome')}
                  styles={styles}
                />
              </div>

              <div style={styles.accountsSection}>
                <h3 style={styles.sectionTitle}>Contas vinculadas</h3>

                <div style={styles.accountList}>
                  {(selected.contas || []).length === 0 ? (
                    <p style={styles.mutedText}>
                      Nenhuma conta vinculada a este registro.
                    </p>
                  ) : (
                    (selected.contas || []).map(
                      (conta: any, index: number) => (
                        <div key={conta.id || index} style={styles.accountCard}>
                          <div style={styles.accountHeader}>
                            <div>
                              <strong>
                                {conta.bancoNome || 'Banco não informado'}
                              </strong>

                              <div style={styles.resultDocument}>
                                Código {conta.bancoCodigo || '—'} ·{' '}
                                {conta.tipoConta || 'Tipo não informado'}
                              </div>
                            </div>

                            <span style={styles.miniTag}>
                              {conta.statusValidacao || 'Pendente'}
                            </span>
                          </div>

                          <div
                            style={styles.accountGrid}
                            className="account-grid"
                          >
                            <InfoField
                              label="Agência"
                              value={conta.agencia || '—'}
                              styles={styles}
                            />
                            <InfoField
                              label="Operação / produto"
                              value={conta.operacaoProduto || '—'}
                              styles={styles}
                            />
                            <CopyField
                              label="Conta"
                              value={getContaApresentacao(conta)}
                              onCopy={() =>
                                copy(
                                  getContaApresentacao(conta) === '—'
                                    ? ''
                                    : getContaApresentacao(conta),
                                  'Conta',
                                )
                              }
                              styles={styles}
                            />
                            <InfoField
                              label="Dígito"
                              value={conta.contaDigito || '—'}
                              styles={styles}
                            />
                            <InfoField
                              label="Titular da conta"
                              value={conta.titularContaNome || '—'}
                              styles={styles}
                            />
                            <InfoField
                              label="Documento do titular"
                              value={conta.titularContaDocumento || '—'}
                              styles={styles}
                            />
                            <InfoField
                              label="Tipo do documento do titular"
                              value={conta.titularTipoDocumento || '—'}
                              styles={styles}
                            />
                            <InfoField
                              label="Titular confirmado"
                              value={conta.titularConfirmado ? 'Sim' : 'Não'}
                              styles={styles}
                            />
                            <InfoField
                              label="Preferencial"
                              value={conta.contaPreferencial ? 'Sim' : 'Não'}
                              styles={styles}
                            />
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      {open && (
        <div style={styles.overlay}>
          <section
            style={styles.drawer}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? 'Editar registro' : 'Novo registro'}
          >
            <div style={styles.panelHeader}>
              <h2 style={styles.detailTitle}>
                {form.id ? 'Editar registro' : 'Novo registro'}
              </h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={styles.ghostBtn}
              >
                Fechar
              </button>
            </div>

            <div style={styles.formGrid} className="form-grid">
              <Field label="Tipo de cadastro" styles={styles}>
                <select
                  value={form.tipoCadastro ?? 'Advogado'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tipoCadastro: event.target.value,
                    })
                  }
                  style={styles.input}
                >
                  {tipos.map((tipoItem) => (
                    <option key={tipoItem}>{tipoItem}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status" styles={styles}>
                <select
                  value={form.status ?? 'Ativo'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value,
                    })
                  }
                  style={styles.input}
                >
                  <option>Ativo</option>
                  <option>Revisar</option>
                  <option>Pendente validação</option>
                  <option>Inativo</option>
                </select>
              </Field>

              <Field label="Nome do favorecido / falecido" styles={styles}>
                <input
                  value={form.nome ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nome: event.target.value,
                    })
                  }
                  style={styles.input}
                />
              </Field>

              <Field label="Tipo de documento" styles={styles}>
                <select
                  value={form.tipoDocumento ?? 'CPF'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tipoDocumento: event.target.value,
                    })
                  }
                  style={styles.input}
                >
                  <option>CPF</option>
                  <option>CNPJ</option>
                </select>
              </Field>

              <Field label="CPF / CNPJ" styles={styles}>
                <input
                  value={form.documento ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      documento: event.target.value,
                    })
                  }
                  style={styles.input}
                />
              </Field>

              <Field label="Situação especial" styles={styles}>
                <select
                  value={form.situacaoEspecial ?? ''}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      situacaoEspecial: event.target.value,
                    })
                  }
                  style={styles.input}
                >
                  <option value="">Nenhuma</option>
                  {situacoesEspeciais
                    .filter((item) => item)
                    .map((item) => (
                      <option key={item} value={item}>
                        {formatSituacaoEspecial(item)}
                      </option>
                    ))}
                </select>
              </Field>

              <div style={{ gridColumn: '1 / -1' }}>
                <Field
                  label="Observação operacional"
                  styles={styles}
                >
                  <input
                    value={form.observacaoOperacional ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        observacaoOperacional: event.target.value,
                      })
                    }
                    placeholder="Ex.: conta bancária do inventariante, sucessor ou terceiro"
                    style={styles.input}
                  />
                </Field>
              </div>
            </div>

            <div style={styles.formAccountsSection}>
              <div style={styles.panelHeader}>
                <h3 style={styles.sectionTitle}>Contas bancárias</h3>

                <button
                  type="button"
                  onClick={addConta}
                  style={styles.ghostBtn}
                >
                  Adicionar conta
                </button>
              </div>

              {form.contas.map((conta: any, index: number) => (
                <div
                  key={conta.id || index}
                  style={styles.formAccountCard}
                >
                  <div style={styles.panelHeader}>
                    <strong>Conta {index + 1}</strong>

                    {form.contas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeConta(index)}
                        style={styles.dangerBtn}
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div style={styles.formGrid} className="form-grid">
                    <Field label="Banco" styles={styles}>
                      <input
                        value={conta.bancoNome ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'bancoNome', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Código do banco" styles={styles}>
                      <input
                        value={conta.bancoCodigo ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'bancoCodigo', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Agência" styles={styles}>
                      <input
                        value={conta.agencia ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'agencia', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Operação / produto" styles={styles}>
                      <input
                        value={conta.operacaoProduto ?? ''}
                        onChange={(event) =>
                          updateConta(
                            index,
                            'operacaoProduto',
                            event.target.value,
                          )
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Conta" styles={styles}>
                      <input
                        value={conta.conta ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'conta', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Número da conta (legado)" styles={styles}>
                      <input
                        value={conta.contaNumero ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'contaNumero', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Dígito da conta" styles={styles}>
                      <input
                        value={conta.contaDigito ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'contaDigito', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Tipo de conta" styles={styles}>
                      <input
                        value={conta.tipoConta ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'tipoConta', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    <Field label="Status de validação" styles={styles}>
                      <select
                        value={conta.statusValidacao ?? 'Pendente'}
                        onChange={(event) =>
                          updateConta(
                            index,
                            'statusValidacao',
                            event.target.value,
                          )
                        }
                        style={styles.input}
                      >
                        <option>Pendente</option>
                        <option>Validada</option>
                        <option>Revisar</option>
                        <option>Inativa</option>
                      </select>
                    </Field>

                    <Field label="Fonte" styles={styles}>
                      <input
                        value={conta.fonte ?? ''}
                        onChange={(event) =>
                          updateConta(index, 'fonte', event.target.value)
                        }
                        style={styles.input}
                      />
                    </Field>

                    {shouldShowTitularFields(form) ? (
                      <>
                        <Field label="Nome do titular da conta" styles={styles}>
                          <input
                            value={conta.titularContaNome ?? ''}
                            onChange={(event) =>
                              updateConta(
                                index,
                                'titularContaNome',
                                event.target.value,
                              )
                            }
                            placeholder="Sucessor, inventariante ou terceiro"
                            style={styles.input}
                          />
                        </Field>

                        <Field
                          label="Tipo do documento do titular"
                          styles={styles}
                        >
                          <select
                            value={conta.titularTipoDocumento ?? 'CPF'}
                            onChange={(event) =>
                              updateConta(
                                index,
                                'titularTipoDocumento',
                                event.target.value,
                              )
                            }
                            style={styles.input}
                          >
                            <option>CPF</option>
                            <option>CNPJ</option>
                          </select>
                        </Field>

                        <Field
                          label="Documento do titular da conta"
                          styles={styles}
                        >
                          <input
                            value={conta.titularContaDocumento ?? ''}
                            onChange={(event) =>
                              updateConta(
                                index,
                                'titularContaDocumento',
                                event.target.value,
                              )
                            }
                            style={styles.input}
                          />
                        </Field>
                      </>
                    ) : null}
                  </div>

                  <div style={styles.checkboxRow}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!conta.contaPreferencial}
                        onChange={(event) =>
                          updateConta(
                            index,
                            'contaPreferencial',
                            event.target.checked,
                          )
                        }
                      />
                      Conta preferencial
                    </label>

                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!conta.titularConfirmado}
                        onChange={(event) =>
                          updateConta(
                            index,
                            'titularConfirmado',
                            event.target.checked,
                          )
                        }
                      />
                      Titular confirmado
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={styles.ghostBtn}
              >
                Cancelar
              </button>

              <button type="button" onClick={save} style={styles.primaryBtn}>
                Salvar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function InfoField({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.fieldLabel}>{label}</div>
      <div style={styles.fieldValue}>{value}</div>
    </div>
  );
}

function CopyField({
  label,
  value,
  onCopy,
  styles,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.fieldLabel}>{label}</div>

      <div style={styles.copyFieldContent}>
        <div style={styles.fieldValue}>{value}</div>

        <button type="button" onClick={onCopy} style={styles.copyBtn}>
          Copiar
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  styles,
}: {
  label: string;
  children: ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <label style={styles.fieldWrapper}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const lightColors = {
  bg: '#f4f6f8',
  surface: '#ffffff',
  surfaceSoft: '#f8fbfd',
  surfaceOffset: '#edf5fb',
  text: '#1f2937',
  muted: '#5f6b76',
  border: '#d7e1ea',
  borderStrong: '#c6d7e4',
  primary: '#1976a2',
  primaryText: '#ffffff',
  primarySoft: '#edf6fb',
  primaryBorder: '#94bdd5',
  tagBg: '#eef6ef',
  tagText: '#42733d',
  dangerBg: '#fff0f4',
  dangerText: '#8d1f58',
  dangerBorder: '#efc2d4',
  overlay: 'rgba(9, 21, 33, 0.36)',
  drawerShadow: 'rgba(9, 21, 33, 0.18)',
  specialBg: '#fff3d9',
  specialText: '#8a5a00',
  specialBorder: '#f1cf88',
  highlightBg: '#fff8e8',
};

const darkColors = {
  bg: '#13191f',
  surface: '#1a232c',
  surfaceSoft: '#202b35',
  surfaceOffset: '#253440',
  text: '#ecf2f6',
  muted: '#afbdc8',
  border: '#354653',
  borderStrong: '#455c6e',
  primary: '#3594bf',
  primaryText: '#f8fcff',
  primarySoft: '#1d3543',
  primaryBorder: '#397695',
  tagBg: '#24392b',
  tagText: '#b7e0af',
  dangerBg: '#432331',
  dangerText: '#ffb4cf',
  dangerBorder: '#7b4058',
  overlay: 'rgba(0, 0, 0, 0.6)',
  drawerShadow: 'rgba(0, 0, 0, 0.45)',
  specialBg: '#4a3a16',
  specialText: '#ffd98a',
  specialBorder: '#7d6330',
  highlightBg: '#2f2819',
};

function makeStyles(colors: typeof lightColors) {
  const app: CSSProperties = {
    minHeight: '100vh',
    padding: 24,
    background: colors.bg,
    color: colors.text,
    fontFamily: 'Inter, Arial, sans-serif',
    transition: 'background 180ms ease, color 180ms ease',
  };

  const baseButton: CSSProperties = {
    minHeight: 44,
    borderRadius: 12,
    padding: '10px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
  };

  const panel: CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
  };

  return {
    app,
    header: {
      ...panel,
      padding: 24,
      display: 'flex',
      justifyContent: 'space-between',
      gap: 16,
      alignItems: 'center',
      marginBottom: 18,
    } as CSSProperties,
    eyebrow: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    } as CSSProperties,
    title: {
      fontSize: 'clamp(28px, 4vw, 36px)',
      margin: '6px 0',
      lineHeight: 1.15,
    } as CSSProperties,
    subtitle: {
      color: colors.muted,
      maxWidth: 760,
      margin: 0,
      lineHeight: 1.5,
    } as CSSProperties,
    headerActions: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    } as CSSProperties,
    primaryBtn: {
      ...baseButton,
      background: colors.primary,
      color: colors.primaryText,
      border: `1px solid ${colors.primary}`,
    } as CSSProperties,
    ghostBtn: {
      ...baseButton,
      background: colors.surface,
      color: colors.text,
      border: `1px solid ${colors.borderStrong}`,
    } as CSSProperties,
    dangerBtn: {
      ...baseButton,
      background: colors.dangerBg,
      color: colors.dangerText,
      border: `1px solid ${colors.dangerBorder}`,
    } as CSSProperties,
    tabsWrap: {
      display: 'flex',
      gap: 10,
      marginBottom: 18,
      flexWrap: 'wrap',
    } as CSSProperties,
    tabButton: {
      ...baseButton,
      minHeight: 40,
      padding: '8px 14px',
      background: colors.surfaceOffset,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: 999,
    } as CSSProperties,
    tabActive: {
      ...baseButton,
      minHeight: 40,
      padding: '8px 14px',
      background: colors.primary,
      color: colors.primaryText,
      border: `1px solid ${colors.primary}`,
      borderRadius: 999,
    } as CSSProperties,
    tabCount: {
      marginLeft: 8,
      opacity: 0.9,
    } as CSSProperties,
    searchPanel: {
      ...panel,
      padding: 18,
      marginBottom: 18,
    } as CSSProperties,
    searchGrid: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) auto',
      gap: 12,
      alignItems: 'end',
    } as CSSProperties,
    searchActions: {
      display: 'flex',
      alignItems: 'end',
      gap: 10,
      flexWrap: 'wrap',
    } as CSSProperties,
    label: {
      display: 'block',
      fontSize: 14,
      color: colors.muted,
      fontWeight: 700,
      marginBottom: 6,
    } as CSSProperties,
    input: {
      width: '100%',
      minHeight: 44,
      padding: '10px 12px',
      borderRadius: 12,
      border: `1px solid ${colors.borderStrong}`,
      background: colors.surface,
      color: colors.text,
      boxSizing: 'border-box',
      outlineColor: colors.primary,
    } as CSSProperties,
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
      gap: 18,
      alignItems: 'start',
    } as CSSProperties,
    listPanel: {
      ...panel,
      padding: 18,
    } as CSSProperties,
    detailPanel: {
      ...panel,
      padding: 22,
      minWidth: 0,
    } as CSSProperties,
    panelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
      flexWrap: 'wrap',
    } as CSSProperties,
    sectionTitle: {
      margin: 0,
      fontSize: 20,
      lineHeight: 1.2,
    } as CSSProperties,
    metaBadge: {
      background: colors.surfaceOffset,
      color: colors.text,
      borderRadius: 999,
      padding: '6px 10px',
      fontSize: 13,
      fontWeight: 700,
    } as CSSProperties,
    resultList: {
      display: 'grid',
      gap: 10,
      marginTop: 14,
    } as CSSProperties,
    resultCard: {
      width: '100%',
      textAlign: 'left',
      background: colors.surfaceSoft,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      borderRadius: 16,
      padding: 14,
      cursor: 'pointer',
    } as CSSProperties,
    resultCardActive: {
      width: '100%',
      textAlign: 'left',
      background: colors.primarySoft,
      border: `1px solid ${colors.primaryBorder}`,
      color: colors.text,
      borderRadius: 16,
      padding: 14,
      cursor: 'pointer',
    } as CSSProperties,
    resultCardContent: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'flex-start',
    } as CSSProperties,
    resultName: {
      fontWeight: 800,
      lineHeight: 1.25,
    } as CSSProperties,
    resultDocument: {
      color: colors.muted,
      fontSize: 14,
      marginTop: 4,
      lineHeight: 1.35,
    } as CSSProperties,
    miniTag: {
      background: colors.tagBg,
      color: colors.tagText,
      borderRadius: 999,
      padding: '4px 10px',
      fontSize: 12,
      fontWeight: 800,
      height: 'fit-content',
      whiteSpace: 'nowrap',
    } as CSSProperties,
    specialMiniTag: {
      background: colors.specialBg,
      color: colors.specialText,
      border: `1px solid ${colors.specialBorder}`,
      borderRadius: 999,
      padding: '4px 10px',
      fontSize: 12,
      fontWeight: 800,
      height: 'fit-content',
      whiteSpace: 'nowrap',
    } as CSSProperties,
    specialBadgeRow: {
      marginTop: 8,
    } as CSSProperties,
    specialBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: colors.specialBg,
      color: colors.specialText,
      border: `1px solid ${colors.specialBorder}`,
      borderRadius: 999,
      padding: '5px 10px',
      fontSize: 12,
      fontWeight: 800,
    } as CSSProperties,
    highlightBox: {
      marginTop: 18,
      padding: 16,
      borderRadius: 18,
      background: colors.highlightBg,
      border: `1px solid ${colors.specialBorder}`,
    } as CSSProperties,
    highlightLabel: {
      fontSize: 12,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.specialText,
      marginBottom: 6,
    } as CSSProperties,
    highlightValue: {
      fontSize: 22,
      fontWeight: 800,
      lineHeight: 1.2,
      color: colors.specialText,
    } as CSSProperties,
    highlightNote: {
      marginTop: 8,
      color: colors.text,
      lineHeight: 1.5,
    } as CSSProperties,
    detailTitle: {
      margin: '6px 0 0',
      fontSize: 'clamp(24px, 3vw, 30px)',
      lineHeight: 1.15,
    } as CSSProperties,
    detailActions: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
    } as CSSProperties,
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 12,
      marginTop: 18,
    } as CSSProperties,
    infoBox: {
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 14,
      background: colors.surfaceSoft,
      minWidth: 0,
    } as CSSProperties,
    fieldLabel: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 6,
      fontWeight: 800,
    } as CSSProperties,
    fieldValue: {
      fontSize: 16,
      fontWeight: 650,
      overflowWrap: 'anywhere',
    } as CSSProperties,
    copyFieldContent: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
    } as CSSProperties,
    accountsSection: {
      marginTop: 24,
    } as CSSProperties,
    accountList: {
      display: 'grid',
      gap: 12,
      marginTop: 12,
    } as CSSProperties,
    accountCard: {
      border: `1px solid ${colors.border}`,
      borderRadius: 18,
      padding: 16,
      background: colors.surfaceSoft,
      minWidth: 0,
    } as CSSProperties,
    accountHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
      alignItems: 'flex-start',
    } as CSSProperties,
    accountGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
    } as CSSProperties,
    copyBtn: {
      minHeight: 36,
      background: colors.surfaceOffset,
      color: colors.text,
      border: `1px solid ${colors.borderStrong}`,
      borderRadius: 10,
      padding: '7px 10px',
      fontSize: 12,
      fontWeight: 800,
      cursor: 'pointer',
      flexShrink: 0,
      textTransform: 'uppercase',
    } as CSSProperties,
    mutedText: {
      color: colors.muted,
    } as CSSProperties,
    emptyState: {
      color: colors.muted,
      padding: '32px 0',
      textAlign: 'center',
    } as CSSProperties,
    overlay: {
      position: 'fixed',
      inset: 0,
      background: colors.overlay,
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 20,
    } as CSSProperties,
    drawer: {
      width: 'min(920px, 100%)',
      height: '100%',
      overflow: 'auto',
      background: colors.bg,
      color: colors.text,
      padding: 22,
      boxShadow: `-16px 0 40px ${colors.drawerShadow}`,
      boxSizing: 'border-box',
    } as CSSProperties,
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: 12,
      marginTop: 18,
    } as CSSProperties,
    fieldWrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    } as CSSProperties,
    formAccountsSection: {
      marginTop: 24,
    } as CSSProperties,
    formAccountCard: {
      border: `1px solid ${colors.border}`,
      borderRadius: 18,
      padding: 16,
      background: colors.surfaceSoft,
      marginTop: 12,
    } as CSSProperties,
    checkboxRow: {
      display: 'flex',
      gap: 16,
      marginTop: 12,
      flexWrap: 'wrap',
    } as CSSProperties,
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: colors.text,
      fontSize: 14,
      cursor: 'pointer',
    } as CSSProperties,
    formActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 22,
      flexWrap: 'wrap',
    } as CSSProperties,
  };
}

const responsiveCss = `
  * {
    box-sizing: border-box;
  }

  button,
  input,
  select {
    font: inherit;
  }

  button {
    transition:
      transform 160ms ease,
      filter 160ms ease,
      background 160ms ease,
      border-color 160ms ease;
  }

  button:hover {
    filter: brightness(0.97);
  }

  button:active {
    transform: translateY(1px);
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid rgba(53, 148, 191, 0.35);
    outline-offset: 2px;
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 720px) {
    .header {
      align-items: flex-start !important;
      flex-direction: column !important;
    }

    .search-grid {
      grid-template-columns: 1fr !important;
    }

    .detail-grid,
    .account-grid,
    .form-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 560px) {
    main {
      padding: 12px !important;
    }

    .header {
      padding: 18px !important;
      border-radius: 16px !important;
    }

    .drawer {
      padding: 16px !important;
    }

    .search-grid > div:last-child,
    .search-grid > div:last-child button {
      width: 100%;
    }

    .search-grid > div:last-child {
      display: grid !important;
      grid-template-columns: 1fr 1fr;
    }

    .detail-grid {
      margin-top: 14px !important;
    }
  }

  @media (max-width: 390px) {
    .search-grid > div:last-child {
      grid-template-columns: 1fr;
    }
  }
`;