/** Las formas que devuelve la API. Espejo de sus esquemas Zod. */

export const ESTADOS = [
  'guardada', 'postulada', 'respuesta', 'entrevista',
  'prueba', 'oferta', 'rechazo', 'retirada',
] as const;

export type Estado = (typeof ESTADOS)[number];

/* Las columnas del tablero NO son los ocho estados.
   'guardada' y 'retirada' no son fases del proceso: una es el borrador y la
   otra una salida. Y 'prueba' y 'respuesta' se agrupan con lo que significan
   para quien mira el tablero. Un tablero con ocho columnas no cabe en una
   pantalla y obliga a desplazarse en horizontal para ver si hay una oferta,
   que es lo único que de verdad quieres ver. */
export const COLUMNAS: Array<{ estado: Estado; titulo: string; ayuda: string }> = [
  { estado: 'postulada',  titulo: 'Enviadas',    ayuda: 'Sin respuesta todavía' },
  { estado: 'respuesta',  titulo: 'Contestaron', ayuda: 'Hay contacto, falta concretar' },
  { estado: 'entrevista', titulo: 'Entrevista',  ayuda: 'Proceso en marcha' },
  { estado: 'oferta',     titulo: 'Oferta',      ayuda: 'Hay propuesta sobre la mesa' },
  { estado: 'rechazo',    titulo: 'Cerradas',    ayuda: 'No siguió adelante' },
];

export interface Postulacion {
  id: string;
  puesto: string;
  empresa: string;
  empresa_id: string;
  fuente: string | null;
  url_oferta: string | null;
  salario_min: number | null;
  salario_max: number | null;
  moneda: string | null;
  modalidad: 'presencial' | 'hibrido' | 'remoto' | null;
  ubicacion: string | null;
  notas: string | null;
  postulado_en: string;
  estado: Estado;
  estado_desde: string | null;
  eventos?: Evento[];
}

export interface Evento {
  id: string;
  tipo: Estado;
  nota: string | null;
  ocurrido_en: string;
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'usuario' | 'admin';
}

export interface Estadisticas {
  total: number;
  por_estado: Partial<Record<Estado, number>>;
  por_mes: Array<{ mes: string; n: number }>;
  respuesta: {
    contestadas: number;
    sin_respuesta: number;
    dias_mediana: number | null;
    dias_media: number | null;
  };
  embudo: {
    postuladas: number;
    entrevistas: number;
    ofertas: number;
    rechazos: number;
    tasa_entrevista: number | null;
    tasa_oferta: number | null;
  };
}

export interface DetalleError {
  campo: string;
  mensaje: string;
}

export class ErrorApi extends Error {
  readonly estado: number;
  readonly codigo: string;
  readonly detalles: DetalleError[] | undefined;

  constructor(mensaje: string, estado: number, codigo: string, detalles?: DetalleError[]) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  /** Mensaje por campo, para pintarlo junto al input y no en un aviso suelto
   *  arriba del formulario que el usuario ya ha dejado atrás al hacer scroll. */
  porCampo(): Record<string, string> {
    return Object.fromEntries((this.detalles ?? []).map((d) => [d.campo, d.mensaje]));
  }
}

export const MODALIDAD_OPCIONES = [
  { valor: 'presencial', texto: 'Presencial' },
  { valor: 'hibrido', texto: 'Híbrido' },
  { valor: 'remoto', texto: 'Remoto' },
] as const;
