/** Una candidatura en el tablero. */

import { COLUMNAS, type Estado, type Postulacion } from '../api/tipos';

interface Props {
  postulacion: Postulacion;
  onAbrir: () => void;
  onMover: (id: string, estado: Estado) => void;
}

export function Tarjeta({ postulacion: p, onAbrir, onMover }: Props) {
  return (
    <article className="tarjeta">
      {/* El botón envuelve solo el texto, no la tarjeta entera: si el
          contenedor arrastrable fuese además un botón, cada intento de
          arrastrar dispararía también el clic. */}
      <button type="button" className="abrir" onClick={onAbrir}>
        <span className="puesto">{p.puesto}</span>
        <span className="empresa">{p.empresa}</span>
      </button>

      <p className="meta">
        {p.ubicacion && <span>{p.ubicacion}</span>}
        {p.modalidad && <span className="etiqueta">{p.modalidad}</span>}
        {sueldo(p) && <span className="sueldo">{sueldo(p)}</span>}
      </p>

      <p className="fecha">
        <time dateTime={p.postulado_en}>{fecha(p.postulado_en)}</time>
        {/* El aviso de parada solo aparece a partir de una semana. Antes de eso
            no dice nada útil —todas las candidaturas llevan pocos días—, y una
            etiqueta que sale siempre deja de leerse. */}
        {parada(p) && <span className="parada"> · {parada(p)}</span>}
      </p>

      {/* La alternativa al arrastre. No es un extra: es lo que hace usable
          esta pantalla con teclado, con lector de pantalla y en un móvil
          donde las columnas no caben a la vez. */}
      <label className="mover">
        <span className="solo-lectores">Mover {p.puesto} a</span>
        <select
          value={columnaDe(p.estado)}
          onChange={(e) => onMover(p.id, e.target.value as Estado)}
        >
          {COLUMNAS.map((c) => (
            <option key={c.estado} value={c.estado}>{c.titulo}</option>
          ))}
        </select>
      </label>
    </article>
  );
}

function columnaDe(e: Estado): Estado {
  return e === 'guardada' ? 'postulada' : e === 'prueba' ? 'entrevista' : e === 'retirada' ? 'rechazo' : e;
}

function sueldo(p: Postulacion): string | null {
  const m = p.moneda ?? 'EUR';
  const f = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: m, maximumFractionDigits: 0 });
  if (p.salario_min != null && p.salario_max != null) return `${f(p.salario_min)} – ${f(p.salario_max)}`;
  if (p.salario_min != null) return `desde ${f(p.salario_min)}`;
  if (p.salario_max != null) return `hasta ${f(p.salario_max)}`;
  return null;
}

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Cuánto lleva esta candidatura sin moverse.
 *
 * Es el dato que de verdad se consulta en un tablero de búsqueda de empleo: no
 * el día exacto en que contestaron, sino cuántos llevan sin decir nada. Doce
 * días parada es la señal de que toca escribir. Una fecha obliga a hacer la
 * resta mentalmente, tarjeta por tarjeta.
 *
 * No se muestra para las cerradas: una candidatura rechazada lleva parada
 * desde siempre y no hay nada que hacer al respecto.
 */
function parada(p: Postulacion): string | null {
  if (p.estado === 'rechazo' || p.estado === 'retirada' || p.estado === 'oferta') return null;
  if (!p.estado_desde) return null;

  const dias = Math.floor((Date.now() - new Date(p.estado_desde).getTime()) / 86_400_000);
  if (dias < 7) return null;
  if (dias < 30) return `${dias} días parada`;

  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'un mes parada' : `${meses} meses parada`;
}
