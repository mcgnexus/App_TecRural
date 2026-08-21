'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Lead } from '@/types';
import { CROPS, FARM_SIZES, PROBLEMS } from '@/lib/crops';

type AuthState = 'loading' | 'out' | 'in';

function labelOf(list: readonly { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label ?? value;
}

function toCsv(leads: Lead[]): string {
  const header = [
    'id',
    'nombre',
    'telefono',
    'municipio',
    'cultivo',
    'tamano_finca',
    'problema',
    'fecha',
    'respondido',
  ];
  const rows = leads.map((l) =>
    [
      l.id,
      l.name,
      `"${l.phone}"`,
      `"${l.municipality}"`,
      labelOf(CROPS, l.crop),
      labelOf(FARM_SIZES, l.farm_size),
      labelOf(PROBLEMS, l.problem),
      l.created_at,
      l.responded_at || '',
    ].join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

function hoursSince(dateStr: string): number {
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthState>('loading');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session');
      const data = await res.json();
      setAuth(data.authenticated ? 'in' : 'out');
    } catch {
      setAuth('out');
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/admin/leads');
      if (res.status === 401) {
        setAuth('out');
        return;
      }
      if (!res.ok) {
        throw new Error(String(res.status));
      }
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    } catch {
      setListError('No se pudieron cargar los contactos.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setAuth('in');
        void loadLeads();
      } else {
        setLoginError(data.error || 'Contraseña incorrecta.');
      }
    } catch {
      setLoginError('No se pudo conectar con el servidor.');
    }
  };

  const onLogout = async () => {
    await fetch('/api/admin/session', { method: 'DELETE' });
    setAuth('out');
    setLeads([]);
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este contacto?')) return;
    const res = await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLeads((l) => l.filter((x) => x.id !== id));
    } else {
      window.alert('No se pudo eliminar el contacto.');
    }
  };

  const onMarkResponded = async (id: number) => {
    const res = await fetch(`/api/admin/leads/${id}`, { method: 'PATCH' });
    if (res.ok) {
      setLeads((l) =>
        l.map((x) =>
          x.id === id ? { ...x, responded_at: new Date().toISOString().replace('T', ' ').slice(0, 19) } : x
        )
      );
    } else {
      window.alert('No se pudo marcar como respondido.');
    }
  };

  const onExport = () => {
    const blob = new Blob([toCsv(leads)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tecrural-contactos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingCount = leads.filter((l) => !l.responded_at && hoursSince(l.created_at) > 24).length;

  if (auth === 'loading') {
    return (
      <div className="admin-wrap">
        <div className="status" role="status">
          <span className="spinner" aria-hidden="true" /> Cargando…
        </div>
      </div>
    );
  }

  if (auth === 'out') {
    return (
      <main className="admin-wrap">
        <form className="card login-card" onSubmit={onLogin}>
          <h1 className="admin-title">Área privada</h1>
          <p className="admin-sub">
            Introduce la contraseña para ver los contactos recibidos.
          </p>
          <div className="field">
            <label htmlFor="admin-pass">Contraseña</label>
            <input
              id="admin-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {loginError && <div className="error-box">{loginError}</div>}
          <button className="btn btn-primary btn-block" type="submit">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-wrap">
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-title">Contactos recibidos</h1>
          <p className="admin-sub">
            {total} contacto{total === 1 ? '' : 's'} guardado
            {total === 1 ? '' : 's'} en la base de datos.
            {pendingCount > 0 && (
              <span className="pending-badge"> {pendingCount} sin responder (&gt;24h)</span>
            )}
          </p>
        </div>
        <div className="spacer" />
        <button className="btn btn-ghost btn-small" onClick={onExport}>
          Exportar CSV
        </button>
        <button className="btn btn-ghost btn-small" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>

      {listError && <div className="error-box">{listError}</div>}

      {loading ? (
        <div className="status" role="status">
          <span className="spinner" aria-hidden="true" /> Cargando contactos…
        </div>
      ) : leads.length === 0 ? (
        <div className="card">
          Todavía no hay contactos. Cuando alguien rellene el formulario de la
          web, aparecerá aquí.
        </div>
      ) : (
        <div className="leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Municipio</th>
                <th>Cultivo</th>
                <th>Finca</th>
                <th>Problema</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const isPending = !l.responded_at && hoursSince(l.created_at) > 24;
                return (
                  <tr key={l.id} className={isPending ? 'row-pending' : undefined}>
                    <td className="mono">{l.created_at}</td>
                    <td>{l.name}</td>
                    <td className="mono">{l.phone}</td>
                    <td>{l.municipality}</td>
                    <td>
                      <span className="tag">{labelOf(CROPS, l.crop)}</span>
                    </td>
                    <td>{labelOf(FARM_SIZES, l.farm_size)}</td>
                    <td>{labelOf(PROBLEMS, l.problem)}</td>
                    <td>
                      {l.responded_at ? (
                        <span className="status-ok">Respondido</span>
                      ) : isPending ? (
                        <span className="status-pending">Pendiente (&gt;24h)</span>
                      ) : (
                        <span className="status-new">Nuevo</span>
                      )}
                    </td>
                    <td>
                      {!l.responded_at && (
                        <button
                          className="btn-respond"
                          onClick={() => onMarkResponded(l.id)}
                          aria-label={`Marcar como respondido a ${l.name}`}
                        >
                          ✓
                        </button>
                      )}
                      <button
                        className="btn-danger-small"
                        onClick={() => onDelete(l.id)}
                        aria-label={`Eliminar contacto de ${l.name}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
