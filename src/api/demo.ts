/**
 * La API de la demo: los mismos métodos que la API real, sobre datos de
 * ejemplo que viven en la memoria de esta pestaña.
 *
 * Por qué existe: quien llega desde el portafolio veía un formulario de
 * acceso y nada más. Para enseñar un tablero no debería hacer falta crear una
 * cuenta en una base de datos de verdad.
 *
 * Qué NO es: no habla con el servidor. Las reglas de las métricas (primera
 * respuesta, mediana, embudo por "ocurrió alguna vez") están copiadas de
 * `api-postulaciones/src/rutas/estadisticas.ts` para que la demo enseñe los
 * mismos números que daría la API con estos datos; si aquella cambia, esta
 * hay que cambiarla a mano.
 */

import type { Api } from './recursos';
import { ErrorApi, type Estadisticas, type Estado, type Evento, type Postulacion, type Usuario } from './tipos';

export const USUARIO_DEMO: Usuario = { id: 'demo', email: 'demo@ejemplo.test', nombre: 'Demo', rol: 'usuario' };

const DIA = 86_400_000;
const CONTESTAN: ReadonlySet<Estado> = new Set(['respuesta', 'entrevista', 'prueba', 'oferta', 'rechazo']);

type Semilla = Pick<Postulacion, 'puesto' | 'empresa' | 'fuente' | 'modalidad' | 'ubicacion' | 'salario_min' | 'salario_max' | 'notas'> & {
  /** Días antes de hoy en que se envió, y en que ocurrió cada paso. */
  hace: number;
  pasos: Array<[Estado, number]>;
};

/* Empresas inventadas, a propósito: una demo con nombres reales parecería un
   registro de procesos de verdad. */
const SEMILLAS: Semilla[] = [
  { puesto: 'Desarrollador/a backend junior', empresa: 'Naranja Software', fuente: 'LinkedIn', modalidad: 'hibrido', ubicacion: 'Madrid', salario_min: 24000, salario_max: 28000, notas: 'Node y PostgreSQL. Segunda entrevista el jueves.', hace: 21, pasos: [['postulada', 21], ['respuesta', 15], ['entrevista', 9]] },
  { puesto: 'Full stack (React y Node)', empresa: 'Taller Digital', fuente: 'Web de la empresa', modalidad: 'remoto', ubicacion: 'España', salario_min: 26000, salario_max: null, notas: null, hace: 30, pasos: [['postulada', 30], ['respuesta', 24], ['entrevista', 18], ['prueba', 12], ['oferta', 3]] },
  { puesto: 'Frontend junior (React)', empresa: 'Estudio Azul', fuente: 'InfoJobs', modalidad: 'presencial', ubicacion: 'Madrid', salario_min: 22000, salario_max: 25000, notas: null, hace: 26, pasos: [['postulada', 26], ['entrevista', 14], ['rechazo', 8]] },
  { puesto: 'Programador/a TypeScript', empresa: 'Cooperativa Lumen', fuente: 'Recomendación', modalidad: 'hibrido', ubicacion: 'Madrid', salario_min: null, salario_max: null, notas: 'Me pasó el contacto una antigua compañera.', hace: 12, pasos: [['postulada', 12], ['respuesta', 10]] },
  { puesto: 'Backend Node.js', empresa: 'Puerto Datos', fuente: 'LinkedIn', modalidad: 'remoto', ubicacion: 'España', salario_min: 25000, salario_max: 30000, notas: null, hace: 19, pasos: [['postulada', 19]] },
  { puesto: 'Desarrollador/a web junior', empresa: 'Horno Creativo', fuente: 'Tecnoempleo', modalidad: 'presencial', ubicacion: 'Alcobendas', salario_min: 21000, salario_max: 23000, notas: null, hace: 8, pasos: [['postulada', 8]] },
  { puesto: 'Ingeniero/a de software junior', empresa: 'Faro Sistemas', fuente: 'LinkedIn', modalidad: 'hibrido', ubicacion: 'Tres Cantos', salario_min: null, salario_max: null, notas: null, hace: 34, pasos: [['postulada', 34], ['rechazo', 20]] },
  { puesto: 'QA de automatización junior', empresa: 'Tinta y Código', fuente: 'Bot de ofertas', modalidad: 'remoto', ubicacion: 'España', salario_min: 23000, salario_max: 26000, notas: 'Guardada desde el bot; pendiente de enviar.', hace: 1, pasos: [['guardada', 1]] },
];

interface Fila extends Postulacion { eventos: Evento[] }

export function apiDemo(ahora: () => number = Date.now): Api {
  let siguiente = 1;
  const id = (prefijo: string) => `${prefijo}-${siguiente++}`;
  const iso = (haceDias: number) => new Date(ahora() - haceDias * DIA).toISOString();

  const filas: Fila[] = SEMILLAS.map((s) => {
    const eventos: Evento[] = s.pasos.map(([tipo, hace]) => ({ id: id('ev'), tipo, nota: null, ocurrido_en: iso(hace) }));
    const ultimo = eventos[eventos.length - 1]!;
    return {
      id: id('p'), puesto: s.puesto, empresa: s.empresa, empresa_id: id('e'),
      fuente: s.fuente, url_oferta: null, salario_min: s.salario_min, salario_max: s.salario_max,
      moneda: s.salario_min != null || s.salario_max != null ? 'EUR' : null,
      modalidad: s.modalidad, ubicacion: s.ubicacion, notas: s.notas,
      postulado_en: iso(s.hace).slice(0, 10), estado: ultimo.tipo, estado_desde: ultimo.ocurrido_en, eventos,
    };
  });

  const buscar = (pid: string): Fila => {
    const f = filas.find((x) => x.id === pid);
    if (!f) throw new ErrorApi('No existe esa candidatura', 404, 'no_encontrado');
    return f;
  };
  const copia = (f: Fila): Postulacion => ({ ...f, eventos: f.eventos.map((e) => ({ ...e })) });
  const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  /** Lo que el formulario manda, pasado a los campos de una fila. Solo toca lo que viene. */
  function aplicar(f: Fila, d: Record<string, unknown>): void {
    if ('puesto' in d) f.puesto = texto(d['puesto']) ?? f.puesto;
    const empresa = d['empresa'];
    if (empresa && typeof empresa === 'object' && 'nombre' in empresa) f.empresa = texto((empresa as { nombre: unknown }).nombre) ?? f.empresa;
    if ('fuente' in d) f.fuente = texto(d['fuente']);
    if ('url_oferta' in d) f.url_oferta = texto(d['url_oferta']);
    if ('salario_min' in d) f.salario_min = numero(d['salario_min']);
    if ('salario_max' in d) f.salario_max = numero(d['salario_max']);
    if ('ubicacion' in d) f.ubicacion = texto(d['ubicacion']);
    if ('notas' in d) f.notas = texto(d['notas']);
    if ('modalidad' in d) {
      const m = d['modalidad'];
      f.modalidad = m === 'presencial' || m === 'hibrido' || m === 'remoto' ? m : null;
    }
    f.moneda = f.salario_min != null || f.salario_max != null ? 'EUR' : null;
  }

  const sinServidor = () => Promise.reject(new ErrorApi('En la demo no hay cuentas: los datos viven solo en esta pestaña', 400, 'demo'));

  return {
    registro: sinServidor,
    acceso: sinServidor,
    yo: async () => ({ usuario: USUARIO_DEMO }),
    salir: async () => undefined,

    postulaciones: async () => ({ postulaciones: filas.map(copia), total: filas.length }),
    detalle: async (pid) => ({ postulacion: copia(buscar(pid)) }),

    crear: async (d) => {
      const puesto = texto(d['puesto']);
      const empresa = d['empresa'] && typeof d['empresa'] === 'object' ? texto((d['empresa'] as { nombre?: unknown }).nombre) : null;
      const detalles = [
        ...(puesto ? [] : [{ campo: 'puesto', mensaje: 'Escribe el puesto' }]),
        ...(empresa ? [] : [{ campo: 'empresa.nombre', mensaje: 'Escribe la empresa' }]),
      ];
      if (detalles.length) throw new ErrorApi('Faltan datos', 400, 'validacion', detalles);

      const enviado = texto(d['postulado_en']) ?? new Date(ahora()).toISOString().slice(0, 10);
      const evento: Evento = { id: id('ev'), tipo: 'postulada', nota: null, ocurrido_en: new Date(ahora()).toISOString() };
      const f: Fila = {
        id: id('p'), puesto: puesto!, empresa: empresa!, empresa_id: id('e'), fuente: null, url_oferta: null,
        salario_min: null, salario_max: null, moneda: null, modalidad: null, ubicacion: null, notas: null,
        postulado_en: enviado, estado: 'postulada', estado_desde: evento.ocurrido_en, eventos: [evento],
      };
      aplicar(f, d);
      filas.unshift(f);
      return { postulacion: copia(f) };
    },

    editar: async (pid, d) => {
      const f = buscar(pid);
      aplicar(f, d);
      return { postulacion: copia(f) };
    },

    borrar: async (pid) => {
      const i = filas.indexOf(buscar(pid));
      filas.splice(i, 1);
    },

    registrarEvento: async (pid, tipo, nota) => {
      const f = buscar(pid);
      const evento: Evento = { id: id('ev'), tipo, nota: nota ?? null, ocurrido_en: new Date(ahora()).toISOString() };
      f.eventos.push(evento);
      f.estado = tipo;
      f.estado_desde = evento.ocurrido_en;
      return { evento: { id: evento.id } };
    },

    estadisticas: async () => estadisticas(filas),
  };
}

/** Las mismas cuentas que hace la API con SQL, sobre las filas en memoria. */
export function estadisticas(filas: ReadonlyArray<Postulacion & { eventos: Evento[] }>): Estadisticas {
  const por_estado: Partial<Record<Estado, number>> = {};
  const meses = new Map<string, number>();
  const dias: number[] = [];
  const paso = { postulada: 0, entrevista: 0, oferta: 0, rechazo: 0 };

  for (const f of filas) {
    por_estado[f.estado] = (por_estado[f.estado] ?? 0) + 1;
    const mes = f.postulado_en.slice(0, 7);
    meses.set(mes, (meses.get(mes) ?? 0) + 1);

    /* Días hasta la PRIMERA respuesta. Las que no han contestado no entran en
       la media: van aparte, en `sin_respuesta`. */
    const primera = f.eventos.filter((e) => CONTESTAN.has(e.tipo)).map((e) => Date.parse(e.ocurrido_en)).sort((a, b) => a - b)[0];
    if (primera !== undefined) dias.push((primera - Date.parse(f.postulado_en)) / DIA);

    /* El embudo cuenta si el paso OCURRIÓ ALGUNA VEZ, no el estado actual. */
    for (const k of ['postulada', 'entrevista', 'oferta', 'rechazo'] as const) {
      if (f.eventos.some((e) => e.tipo === k)) paso[k]++;
    }
  }

  const redondear = (n: number) => Math.round(n * 10) / 10;
  const tasa = (parte: number, total: number) => (total ? Math.round((parte / total) * 1000) / 10 : null);

  return {
    total: filas.length,
    por_estado,
    por_mes: [...meses].sort(([a], [b]) => a.localeCompare(b)).map(([mes, n]) => ({ mes, n })),
    respuesta: {
      contestadas: dias.length,
      sin_respuesta: filas.length - dias.length,
      dias_mediana: dias.length ? redondear(mediana(dias)) : null,
      dias_media: dias.length ? redondear(dias.reduce((s, d) => s + d, 0) / dias.length) : null,
    },
    embudo: {
      postuladas: paso.postulada,
      entrevistas: paso.entrevista,
      ofertas: paso.oferta,
      rechazos: paso.rechazo,
      tasa_entrevista: tasa(paso.entrevista, paso.postulada),
      tasa_oferta: tasa(paso.oferta, paso.postulada),
    },
  };
}

/** Mediana con interpolación, como `percentile_cont(0.5)` de PostgreSQL. */
function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const mitad = (v.length - 1) / 2;
  return (v[Math.floor(mitad)]! + v[Math.ceil(mitad)]!) / 2;
}
