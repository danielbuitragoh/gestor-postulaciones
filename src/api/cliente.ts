/**
 * Cliente de la API: una sola puerta por la que pasan todas las peticiones.
 *
 * Aquí viven las dos cosas que no son obvias de un front con tokens:
 *
 * 1. DÓNDE SE GUARDA CADA TOKEN. El de acceso vive en memoria, nunca en
 *    localStorage. Cualquier script que se cuele en la página —una dependencia
 *    comprometida, una extensión— puede leer localStorage entero. En memoria
 *    muere al recargar, que es exactamente por lo que hace falta el de
 *    refresco.
 *
 *    El de refresco SÍ va a localStorage, y eso es un compromiso consciente:
 *    lo correcto es una cookie `httpOnly`, que el JavaScript no puede leer.
 *    Requiere que la API y el front compartan dominio o se configure
 *    `SameSite`/CORS con credenciales, y este front está pensado para
 *    desplegarse aparte de la API. El compromiso es: la ventana de exposición
 *    se limita rotando el token en cada uso (la API lo hace), así que un token
 *    robado deja de servir en cuanto el usuario legítimo refresca — y el
 *    refresco fallido delata el robo.
 *
 * 2. EL REFRESCO CONCURRENTE. Es el fallo que casi nadie ve hasta producción:
 *    si el token caduca y la pantalla lanza tres peticiones a la vez, las tres
 *    reciben 401 y las tres piden un refresco. Como la API ROTA el token, la
 *    primera lo consume y las otras dos llegan con uno ya revocado: el usuario
 *    se ve expulsado sin motivo, de forma intermitente, y solo cuando hay
 *    varias peticiones simultáneas. Se resuelve con una sola promesa
 *    compartida, más abajo.
 */

import { ErrorApi, type DetalleError } from './tipos';

const CLAVE_REFRESCO = 'gestor.refresco';

export class Cliente {
  private acceso: string | null = null;
  /** La promesa del refresco en curso, si lo hay. Es el candado. */
  private refrescando: Promise<string> | null = null;

  readonly base: string;

  constructor(base: string) {
    this.base = base;
  }

  get haySesion(): boolean {
    return Boolean(this.acceso ?? leerRefresco());
  }

  guardarSesion(acceso: string, refresco: string): void {
    this.acceso = acceso;
    try {
      localStorage.setItem(CLAVE_REFRESCO, refresco);
    } catch {
      /* Modo privado de Safari, cuota llena, almacenamiento bloqueado. La
         sesión sigue funcionando hasta que se recargue la página; caerse
         entero por no poder guardar sería peor. */
    }
  }

  cerrarSesion(): void {
    this.acceso = null;
    try { localStorage.removeItem(CLAVE_REFRESCO); } catch { /* ver arriba */ }
  }

  /* ---------------------------------------------------------------- */

  async peticion<T>(ruta: string, opciones: RequestInit & { sinAuth?: boolean } = {}): Promise<T> {
    const { sinAuth, ...resto } = opciones;

    const lanzar = (token: string | null) =>
      fetch(`${this.base}${ruta}`, {
        ...resto,
        headers: {
          ...(resto.body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...resto.headers,
        },
      });

    if (sinAuth) return interpretar<T>(await lanzar(null));

    if (!this.acceso) await this.refrescar();

    let r = await lanzar(this.acceso);

    /* Un solo reintento. Si tras refrescar sigue dando 401, el problema no es
       el token: reintentar en bucle solo convierte un error en un cuelgue. */
    if (r.status === 401) {
      await this.refrescar();
      r = await lanzar(this.acceso);
    }

    return interpretar<T>(r);
  }

  /**
   * Refresca el token, con una sola petición en vuelo por muchas que lo pidan.
   *
   * Todas las llamadas simultáneas esperan la MISMA promesa; la segunda no
   * lanza una petición nueva. Sin esto, tres peticiones caducadas a la vez
   * rotan el token tres veces y expulsan al usuario.
   */
  private refrescar(): Promise<string> {
    if (this.refrescando) return this.refrescando;

    this.refrescando = (async () => {
      const refresco = leerRefresco();
      if (!refresco) throw new ErrorApi('Sesión no iniciada', 401, 'no_autenticado');

      const r = await fetch(`${this.base}/auth/refresco`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresco }),
      });

      if (!r.ok) {
        this.cerrarSesion();
        throw new ErrorApi('La sesión ha caducado', 401, 'no_autenticado');
      }

      const datos = (await r.json()) as { acceso: string; refresco: string };
      this.guardarSesion(datos.acceso, datos.refresco);
      return datos.acceso;
    })();

    /* El candado se suelta pase lo que pase. Si solo se soltara al ir bien,
       un refresco fallido dejaría la aplicación esperando para siempre una
       promesa rechazada que nadie va a reintentar. */
    this.refrescando = this.refrescando.finally(() => { this.refrescando = null; }) as Promise<string>;
    return this.refrescando;
  }
}

/* ------------------------------------------------------------------ */

function leerRefresco(): string | null {
  try { return localStorage.getItem(CLAVE_REFRESCO); } catch { return null; }
}

async function interpretar<T>(r: Response): Promise<T> {
  if (r.status === 204) return undefined as T;

  const texto = await r.text();
  let cuerpo: unknown = null;
  try { cuerpo = texto ? JSON.parse(texto) : null; } catch { /* no era JSON */ }

  if (r.ok) return cuerpo as T;

  const e = (cuerpo as { error?: { mensaje?: string; codigo?: string; detalles?: DetalleError[] } })?.error;

  /* Un mensaje para el usuario, no el código de estado a secas. "Error 500"
     no le dice a nadie qué hacer a continuación. */
  throw new ErrorApi(
    e?.mensaje ?? mensajeGenerico(r.status),
    r.status,
    e?.codigo ?? 'desconocido',
    e?.detalles,
  );
}

function mensajeGenerico(estado: number): string {
  if (estado === 0 || estado >= 500) return 'El servidor no responde. Inténtalo de nuevo en un momento.';
  if (estado === 404) return 'No se encontró lo que buscabas.';
  if (estado === 429) return 'Demasiados intentos seguidos. Espera un poco.';
  return 'La petición no se pudo completar.';
}
