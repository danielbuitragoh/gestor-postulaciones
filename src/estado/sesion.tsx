/**
 * La sesión, en un contexto.
 *
 * `cargando` empieza en true y hay una razón: al recargar la página el token
 * de acceso se ha perdido (vive en memoria) y hay que canjear el de refresco.
 * Si el estado inicial fuera "sin sesión", el usuario vería el formulario de
 * login parpadear medio segundo en cada recarga aunque su sesión fuese
 * perfectamente válida.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Cliente } from '../api/cliente';
import { recursos, type Api } from '../api/recursos';
import type { Usuario } from '../api/tipos';

const BASE = import.meta.env['VITE_API'] ?? 'http://localhost:3000';

interface Valor {
  api: Api;
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (u: Usuario, acceso: string, refresco: string) => void;
  salir: () => void;
}

const Contexto = createContext<Valor | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const cliente = useMemo(() => new Cliente(BASE), []);
  const api = useMemo(() => recursos(cliente), [cliente]);

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;

    if (!cliente.haySesion) { setCargando(false); return; }

    api.yo()
      .then((r) => { if (vigente) setUsuario(r.usuario); })
      .catch(() => { if (vigente) { cliente.cerrarSesion(); setUsuario(null); } })
      .finally(() => { if (vigente) setCargando(false); });

    /* El guardia evita el aviso de actualizar un componente desmontado, que en
       desarrollo salta siempre porque React monta los efectos dos veces. */
    return () => { vigente = false; };
  }, [api, cliente]);

  const entrar = useCallback((u: Usuario, acceso: string, refresco: string) => {
    cliente.guardarSesion(acceso, refresco);
    setUsuario(u);
  }, [cliente]);

  const salir = useCallback(() => {
    /* Se limpia el estado local SIN esperar a la API. Si el servidor no
       responde, el usuario que pulsó salir tiene que quedarse fuera igual:
       dejarle dentro porque falló una petición es lo contrario de lo que pidió. */
    void api.salir().catch(() => {});
    cliente.cerrarSesion();
    setUsuario(null);
  }, [api, cliente]);

  const valor = useMemo<Valor>(
    () => ({ api, usuario, cargando, entrar, salir }),
    [api, usuario, cargando, entrar, salir],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Valor {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSesion fuera del proveedor');
  return v;
}
