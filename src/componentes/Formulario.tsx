/** Alta y edición de una candidatura. */

import { useState, type FormEvent } from 'react';
import { ErrorApi, MODALIDAD_OPCIONES, type Postulacion } from '../api/tipos';

interface Props {
  inicial?: Postulacion | undefined;
  onGuardar: (datos: Record<string, unknown>) => Promise<unknown>;
  onHecho: () => void;
}

export function Formulario({ inicial, onGuardar, onHecho }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErrores({});
    setGeneral(null);

    const f = new FormData(e.currentTarget);
    const t = (k: string) => {
      const v = String(f.get(k) ?? '').trim();
      return v === '' ? undefined : v;
    };
    const n = (k: string) => {
      const v = t(k);
      return v === undefined ? undefined : Number(v);
    };

    const datos: Record<string, unknown> = {
      puesto: t('puesto'),
      fuente: t('fuente'),
      url_oferta: t('url_oferta'),
      salario_min: n('salario_min'),
      salario_max: n('salario_max'),
      modalidad: t('modalidad'),
      ubicacion: t('ubicacion'),
      notas: t('notas'),
    };

    if (inicial) {
      /* En edición, un campo vaciado se envía como null (bórralo), no como
         undefined (no lo toques). La API distingue las dos cosas y esta es la
         mitad del cliente que lo hace posible. */
      for (const k of ['fuente', 'url_oferta', 'salario_min', 'salario_max', 'modalidad', 'ubicacion', 'notas']) {
        if (datos[k] === undefined) datos[k] = null;
      }
    } else {
      datos['empresa'] = { nombre: t('empresa') };
      datos['postulado_en'] = t('postulado_en');
      for (const k of Object.keys(datos)) if (datos[k] === undefined) delete datos[k];
    }

    try {
      await onGuardar(datos);
      onHecho();
    } catch (err) {
      if (err instanceof ErrorApi && err.detalles?.length) {
        /* Los mensajes van junto a su campo. Un aviso genérico arriba obliga a
           adivinar cuál de los ocho campos está mal. */
        setErrores(err.porCampo());
      } else {
        setGeneral(err instanceof Error ? err.message : 'No se pudo guardar');
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="formulario" noValidate>
      {general && <p className="aviso-error" role="alert">{general}</p>}

      {!inicial && (
        <Campo nombre="empresa" etiqueta="Empresa" requerido error={errores['empresa.nombre'] ?? errores['empresa']} />
      )}

      <Campo nombre="puesto" etiqueta="Puesto" requerido defecto={inicial?.puesto} error={errores['puesto']} />

      <div className="dos">
        <Campo nombre="ubicacion" etiqueta="Ubicación" defecto={inicial?.ubicacion ?? ''} error={errores['ubicacion']} />
        <label className="campo">
          <span>Modalidad</span>
          <select name="modalidad" defaultValue={inicial?.modalidad ?? ''}>
            <option value="">Sin especificar</option>
            {MODALIDAD_OPCIONES.map((m) => <option key={m.valor} value={m.valor}>{m.texto}</option>)}
          </select>
        </label>
      </div>

      <div className="dos">
        <Campo nombre="salario_min" etiqueta="Salario mínimo" tipo="number" defecto={inicial?.salario_min ?? ''} error={errores['salario_min']} />
        <Campo nombre="salario_max" etiqueta="Salario máximo" tipo="number" defecto={inicial?.salario_max ?? ''} error={errores['salario_max']} />
      </div>

      <div className="dos">
        <Campo nombre="fuente" etiqueta="Dónde la vi" defecto={inicial?.fuente ?? ''} error={errores['fuente']} />
        {!inicial && <Campo nombre="postulado_en" etiqueta="Fecha de envío" tipo="date" defecto={hoy()} error={errores['postulado_en']} />}
      </div>

      <Campo nombre="url_oferta" etiqueta="Enlace a la oferta" tipo="url" defecto={inicial?.url_oferta ?? ''} error={errores['url_oferta']} />

      <label className="campo">
        <span>Notas</span>
        <textarea name="notas" rows={3} defaultValue={inicial?.notas ?? ''} />
      </label>

      <div className="acciones">
        <button type="submit" className="boton principal" disabled={enviando}>
          {enviando ? 'Guardando…' : inicial ? 'Guardar cambios' : 'Añadir candidatura'}
        </button>
      </div>
    </form>
  );
}

function Campo(
  { nombre, etiqueta, tipo = 'text', defecto, requerido, error }:
  { nombre: string; etiqueta: string; tipo?: string; defecto?: string | number; requerido?: boolean; error?: string | undefined },
) {
  const idError = `${nombre}-error`;
  return (
    <label className="campo">
      <span>{etiqueta}{requerido && <i aria-hidden="true"> *</i>}</span>
      <input
        name={nombre}
        type={tipo}
        defaultValue={defecto ?? ''}
        required={requerido}
        aria-invalid={error ? true : undefined}
        /* Enlazado al mensaje: sin `aria-describedby`, un lector de pantalla
           anuncia el campo y no dice qué tiene de malo. */
        aria-describedby={error ? idError : undefined}
      />
      {error && <em id={idError} className="error">{error}</em>}
    </label>
  );
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}
