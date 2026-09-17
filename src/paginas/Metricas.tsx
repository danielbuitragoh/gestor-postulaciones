/**
 * Las métricas que la API sabe calcular porque guarda el historial.
 *
 * Se dibujan con HTML y CSS, sin librería de gráficos. Son tres barras y un
 * embudo: meter 120 kB de Recharts en el paquete para esto es peso que paga
 * el usuario en cada carga a cambio de nada.
 */

import { useEffect, useState } from 'react';
import { useSesion } from '../estado/sesion';
import type { Estadisticas } from '../api/tipos';

export function Metricas() {
  const { api } = useSesion();
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let vigente = true;
    api.estadisticas()
      .then((d) => { if (vigente) setDatos(d); })
      .catch((e: Error) => { if (vigente) setError(e); });
    return () => { vigente = false; };
  }, [api]);

  if (error) return <p className="aviso-error" role="alert">{error.message}</p>;
  if (!datos) return <div className="esqueleto" style={{ height: 260 }} aria-label="Cargando métricas" />;

  if (datos.total === 0) {
    /* Estado vacío con instrucción, no un panel de ceros. Un embudo a cero no
       está midiendo nada: decirlo con números sugiere un resultado. */
    return (
      <div className="vacio-grande">
        <h2>Todavía no hay nada que medir</h2>
        <p>Añade tu primera candidatura y aquí aparecerán los tiempos de respuesta y el embudo.</p>
      </div>
    );
  }

  const { embudo, respuesta } = datos;

  return (
    <div className="metricas">
      <section className="panel">
        <h2>Cuánto tardan en contestar</h2>
        <div className="numerones">
          <Numeron
            valor={respuesta.dias_mediana}
            unidad="días"
            texto="mediana hasta la primera respuesta"
            /* Mediana y no media, y se dice cuál es. Dos procesos que
               contestaron a los 5 días y uno que contestó a los 90 dan una
               media de 33: un número que no le ha pasado a nadie. */
            nota={respuesta.dias_media != null ? `media ${respuesta.dias_media}` : undefined}
          />
          <Numeron valor={respuesta.contestadas} texto="han contestado" />
          <Numeron valor={respuesta.sin_respuesta} texto="siguen sin respuesta" />
        </div>
        {respuesta.contestadas === 0 && (
          <p className="pista">
            Aún no ha contestado nadie, así que no hay tiempo medio que calcular.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Embudo</h2>
        <p className="explica">
          Cuenta por dónde ha pasado cada candidatura, no dónde acabó: una que
          llegó a entrevista y terminó en rechazo pasó por la entrevista.
        </p>

        <ul className="embudo">
          <Barra texto="Enviadas" n={embudo.postuladas} de={embudo.postuladas} />
          <Barra texto="Entrevistas" n={embudo.entrevistas} de={embudo.postuladas} tasa={embudo.tasa_entrevista} />
          <Barra texto="Ofertas" n={embudo.ofertas} de={embudo.postuladas} tasa={embudo.tasa_oferta} />
          <Barra texto="Cerradas sin éxito" n={embudo.rechazos} de={embudo.postuladas} />
        </ul>
      </section>

      <section className="panel">
        <h2>Por mes</h2>
        <ul className="meses">
          {datos.por_mes.map((m) => (
            <li key={m.mes}>
              <span className="mes">{nombreMes(m.mes)}</span>
              <span className="barra" style={{ width: `${(m.n / maximo(datos)) * 100}%` }} aria-hidden="true" />
              {/* El número va escrito además de dibujado: una barra sin cifra
                  obliga a estimar contra un eje que aquí no existe. */}
              <span className="n">{m.n}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Numeron({ valor, unidad, texto, nota }: { valor: number | null; unidad?: string; texto: string; nota?: string | undefined }) {
  return (
    <div className="numeron">
      <p className="cifra">
        {valor === null ? '—' : valor}
        {valor !== null && unidad && <small> {unidad}</small>}
      </p>
      <p className="texto">{texto}</p>
      {nota && <p className="nota">{nota}</p>}
    </div>
  );
}

function Barra({ texto, n, de, tasa }: { texto: string; n: number; de: number; tasa?: number | null }) {
  const ancho = de > 0 ? (n / de) * 100 : 0;
  return (
    <li>
      <p className="etiqueta">
        {texto}
        <b>{n}{tasa != null && <span className="tasa"> · {tasa}%</span>}</b>
      </p>
      <div className="via"><span style={{ width: `${ancho}%` }} /></div>
    </li>
  );
}

function maximo(d: Estadisticas): number {
  return Math.max(1, ...d.por_mes.map((m) => m.n));
}

function nombreMes(iso: string): string {
  const [a, m] = iso.split('-');
  const fecha = new Date(Number(a), Number(m) - 1, 1);
  return fecha.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}
