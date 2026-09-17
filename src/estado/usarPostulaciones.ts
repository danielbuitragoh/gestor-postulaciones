/**
 * Los datos del tablero, con actualización optimista.
 *
 * Mover una tarjeta escribe primero en la pantalla y después en el servidor.
 * Esperar la respuesta significa que la tarjeta se queda pegada al dedo medio
 * segundo y vuelve a su sitio: la interfaz se siente rota aunque funcione.
 *
 * Lo que casi nunca se hace, y es la mitad que importa: DESHACER si falla. Una
 * actualización optimista sin vuelta atrás es peor que no tenerla — la pantalla
 * dice que la candidatura está en "Entrevista" y el servidor no se enteró, así
 * que al recargar el cambio ha desaparecido sin que nadie avisara.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Api } from '../api/recursos';
import { ErrorApi, type Estado, type Postulacion } from '../api/tipos';

interface Estado0 {
  postulaciones: Postulacion[];
  cargando: boolean;
  error: Error | null;
}

export function usarPostulaciones(api: Api) {
  const [s, setS] = useState<Estado0>({ postulaciones: [], cargando: true, error: null });
  const [aviso, setAviso] = useState<string | null>(null);
  const montado = useRef(true);

  useEffect(() => () => { montado.current = false; }, []);

  const recargar = useCallback(async () => {
    setS((v) => ({ ...v, cargando: true, error: null }));
    try {
      const r = await api.postulaciones();
      if (montado.current) setS({ postulaciones: r.postulaciones, cargando: false, error: null });
    } catch (e) {
      if (montado.current) setS({ postulaciones: [], cargando: false, error: e as Error });
    }
  }, [api]);

  useEffect(() => { void recargar(); }, [recargar]);

  /** Mueve una tarjeta de columna registrando el evento correspondiente. */
  const mover = useCallback(async (id: string, estado: Estado) => {
    let previo: Postulacion[] = [];

    setS((v) => {
      previo = v.postulaciones;
      return {
        ...v,
        postulaciones: v.postulaciones.map((p) =>
          p.id === id ? { ...p, estado, estado_desde: new Date().toISOString() } : p,
        ),
      };
    });

    try {
      await api.registrarEvento(id, estado);
      setAviso(null);
    } catch (e) {
      /* Vuelta atrás Y aviso. Solo revertir dejaría al usuario viendo cómo la
         tarjeta salta sola a su columna anterior sin explicación. */
      if (montado.current) {
        setS((v) => ({ ...v, postulaciones: previo }));
        setAviso(e instanceof ErrorApi ? e.message : 'No se pudo guardar el cambio');
      }
    }
  }, [api]);

  const crear = useCallback(async (datos: Record<string, unknown>) => {
    const r = await api.crear(datos);
    /* Aquí NO se es optimista: la fila que devuelve el servidor trae el id, la
       fecha y el nombre de empresa ya resueltos. Inventarlos en el cliente
       para luego sustituirlos es pedir que se desincronicen. */
    setS((v) => ({ ...v, postulaciones: [r.postulacion, ...v.postulaciones] }));
    return r.postulacion;
  }, [api]);

  const editar = useCallback(async (id: string, datos: Record<string, unknown>) => {
    const r = await api.editar(id, datos);
    setS((v) => ({
      ...v,
      postulaciones: v.postulaciones.map((p) => (p.id === id ? r.postulacion : p)),
    }));
    return r.postulacion;
  }, [api]);

  const borrar = useCallback(async (id: string) => {
    let previo: Postulacion[] = [];
    setS((v) => {
      previo = v.postulaciones;
      return { ...v, postulaciones: v.postulaciones.filter((p) => p.id !== id) };
    });
    try {
      await api.borrar(id);
    } catch (e) {
      if (montado.current) {
        setS((v) => ({ ...v, postulaciones: previo }));
        setAviso(e instanceof ErrorApi ? e.message : 'No se pudo borrar');
      }
      throw e;
    }
  }, [api]);

  return { ...s, aviso, descartarAviso: () => setAviso(null), recargar, mover, crear, editar, borrar };
}
