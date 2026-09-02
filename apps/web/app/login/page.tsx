'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signIn('google', { redirectTo: '/' });
    } catch (err) {
      console.error('Erro ao iniciar login:', err);
      setLoading(false);
    }
  };

  const getErrorMessage = () => {
    if (error === 'DomainRestricted' || error === 'AccessDenied') {
      return {
        title: 'Acesso Restrito a @trt4.jus.br',
        description:
          'Este sistema é de uso institucional exclusivo. Apenas contas do Google Workspace com o domínio @trt4.jus.br têm permissão de acesso.',
      };
    }
    if (error) {
      return {
        title: 'Falha na Autenticação',
        description:
          'Não foi possível concluir o login com o Google. Por favor, tente novamente.',
      };
    }
    return null;
  };

  const errorInfo = getErrorMessage();

  return (
    <div style={styles.container}>
      {/* Background decoration */}
      <div style={styles.bgGlow} />

      <div style={styles.card}>
        {/* Header / Logo */}
        <div style={styles.header}>
          <div style={styles.badge}>Justiça do Trabalho • TRT4</div>
          <div style={styles.iconContainer}>
            <svg
              width="44"
              height="44"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0f3460"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={styles.title}>Consulta de Favorecidos</h1>
          <p style={styles.subtitle}>
            Sistema de Gestão e Consulta de Dados Bancários de Advogados, Peritos e Associações
          </p>
        </div>

        {/* Error Alert if any */}
        {errorInfo && (
          <div style={styles.errorBox}>
            <div style={styles.errorIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <div style={styles.errorTitle}>{errorInfo.title}</div>
              <div style={styles.errorDesc}>{errorInfo.description}</div>
            </div>
          </div>
        )}

        {/* Login Action */}
        <div style={styles.actionSection}>
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              ...styles.googleButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Redirecionando...' : 'Entrar com Google institucional'}</span>
          </button>

          <div style={styles.domainNotice}>
            <span style={styles.domainTag}>@trt4.jus.br</span>
            <span>Apenas contas autorizadas do Tribunal Regional do Trabalho da 4ª Região.</span>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span>Tribunal Regional do Trabalho da 4ª Região (RS)</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={styles.loadingContainer}>Carregando...</div>}>
      <LoginContent />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a192f',
    background: 'radial-gradient(ellipse at 50% 20%, #172a45 0%, #0a192f 100%)',
    padding: '24px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  bgGlow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 50%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    padding: '40px 32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  badge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#0f3460',
    backgroundColor: '#e8f0fe',
    padding: '6px 14px',
    borderRadius: '9999px',
    marginBottom: '16px',
  },
  iconContainer: {
    width: '72px',
    height: '72px',
    margin: '0 auto 16px auto',
    borderRadius: '20px',
    backgroundColor: '#f0f4fc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 8px 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
  errorBox: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    padding: '14px 16px',
    marginBottom: '24px',
    alignItems: 'flex-start',
  },
  errorIcon: {
    marginTop: '2px',
    flexShrink: 0,
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#991b1b',
    marginBottom: '4px',
  },
  errorDesc: {
    fontSize: '13px',
    color: '#b91c1c',
    lineHeight: '1.4',
  },
  actionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    border: '1.5px solid #e5e7eb',
    borderRadius: '14px',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
  },
  domainNotice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  },
  domainTag: {
    fontWeight: 700,
    color: '#0f3460',
    backgroundColor: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  footer: {
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: '1px solid #f1f5f9',
    textAlign: 'center',
    fontSize: '12px',
    color: '#94a3b8',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a192f',
    color: '#ffffff',
    fontSize: '16px',
  },
};
