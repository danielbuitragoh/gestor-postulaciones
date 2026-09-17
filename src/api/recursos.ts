/** Las llamadas concretas, encima del cliente. */

import type { Cliente } from './cliente';
import type { Estadisticas, Estado, Postulacion, Usuario } from './tipos';

export interface Sesion {
  usuario: Usuario;
  acceso: string;
  refresco: string;
}

export function recursos(c: Cliente) {
  return {
    /* ---- sesión ---- */
    registro: (d: { email: string; contrasena: string; nombre: string }) =>
      c.peticion<Sesion>('/auth/registro', { method: 'POST', body: JSON.stringify(d), sinAuth: true }),

    acceso: (d: { email: string; contrasena: string }) =>
      c.peticion<Sesion>('/auth/acceso', { method: 'POST', body: JSON.stringify(d), sinAuth: true }),

    yo: () => c.peticion<{ usuario: Usuario }>('/auth/yo'),

    salir: () => c.peticion<void>('/auth/salir', { method: 'POST' }),

    /* ---- datos ---- */
    /* El tablero pide hasta 100 de una vez a propósito: paginar un tablero
       Kanban no tiene sentido — la columna "Oferta" con 3 tarjetas de la
       página 2 mentiría sobre cuántas ofertas hay. Si alguien pasa de 100
       candidaturas activas, el problema deja de ser de interfaz. */
    postulaciones: () =>
      c.peticion<{ postulaciones: Postulacion[]; total: number }>('/postulaciones?limite=100'),

    detalle: (id: string) =>
      c.peticion<{ postulacion: Postulacion }>(`/postulaciones/${id}`),

    crear: (d: Record<string, unknown>) =>
      c.peticion<{ postulacion: Postulacion }>('/postulaciones', { method: 'POST', body: JSON.stringify(d) }),

    editar: (id: string, d: Record<string, unknown>) =>
      c.peticion<{ postulacion: Postulacion }>(`/postulaciones/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),

    borrar: (id: string) =>
      c.peticion<void>(`/postulaciones/${id}`, { method: 'DELETE' }),

    registrarEvento: (id: string, tipo: Estado, nota?: string) =>
      c.peticion<{ evento: { id: string } }>(`/postulaciones/${id}/eventos`, {
        method: 'POST',
        body: JSON.stringify({ tipo, ...(nota ? { nota } : {}) }),
      }),

    estadisticas: () => c.peticion<Estadisticas>('/estadisticas'),
  };
}

export type Api = ReturnType<typeof recursos>;
