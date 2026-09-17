/** La pantalla principal: tablero, métricas y el diálogo de detalle. */

import { useState } from 'react';
import { useSesion } from '../estado/sesion';
import { usarPostulaciones } from '../estado/usarPostulaciones';
import { Tablero } from '../componentes/Tablero';
import { Dialogo } from '../componentes/Dialogo';
import { Formulario } from '../componentes/Formulario';
import { Metricas } from './Metricas';
import type { Postulacion } from '../api/tipos';

type Vista = 'tablero' | 'metricas';

export function Panel() {
  const { api, usuario, salir } = useSesion();
  const datos = usarPostulaciones(api);

  const [vista, setVista] = useState<Vista>('tablero');
  const [nueva, setNueva] = useState(false);
  const [editando, setEditando] = useState<Postulacion | null>(null);

  return (
    <div className="marco">
      <header className="barra">
        <div>
          <h1>Candidaturas</h1>
          <p className="sub">
            {datos.cargando ? 'Cargando…' : `${datos.postulaciones.length} en seguimiento`}
          </p>
        </div>

        <nav className="grupo" aria-label="Vista">
          {(['tablero', 'metricas'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              aria-pressed={vista === v}
            >
              {v === 'tablero' ? 'Tablero' : 'Métricas'}
            </button>
          ))}
        </nav>

        <div className="derecha">
          <button type="button" className="boton principal" onClick={() => setNueva(true)}>
            Añadir
          </button>
          <button type="button" className="enlace" onClick={salir}>
            Salir{usuario ? ` (${usuario.nombre})` : ''}
          </button>
        </div>
      </header>

      {/* El aviso de un cambio revertido vive fuera del tablero y con
          `role="status"`: si apareciera dentro de la columna, el propio
          movimiento que falló lo sacaría de la vista. */}
      {datos.aviso && (
        <p className="aviso-error" role="status">
          {datos.aviso}
          <button type="button" className="enlace" onClick={datos.descartarAviso}>Vale</button>
        </p>
      )}

      {datos.error ? (
        <div className="aviso" role="alert">
          <h2>No se pudieron cargar tus candidaturas</h2>
          <p>{datos.error.message}</p>
          <button type="button" className="boton" onClick={() => void datos.recargar()}>Reintentar</button>
        </div>
      ) : vista === 'metricas' ? (
        <Metricas />
      ) : datos.cargando ? (
        <div className="esqueleto" style={{ height: 420 }} aria-label="Cargando el tablero" />
      ) : datos.postulaciones.length === 0 ? (
        <div className="vacio-grande">
          <h2>Tu tablero está vacío</h2>
          <p>Añade la primera candidatura y ve moviéndola según avance el proceso.</p>
          <button type="button" className="boton principal" onClick={() => setNueva(true)}>Añadir la primera</button>
        </div>
      ) : (
        <Tablero
          postulaciones={datos.postulaciones}
          onMover={(id, estado) => void datos.mover(id, estado)}
          onAbrir={setEditando}
        />
      )}

      <Dialogo abierto={nueva} titulo="Nueva candidatura" onCerrar={() => setNueva(false)}>
        <Formulario onGuardar={datos.crear} onHecho={() => setNueva(false)} />
      </Dialogo>

      <Dialogo
        abierto={editando !== null}
        titulo={editando ? editando.puesto : ''}
        onCerrar={() => setEditando(null)}
      >
        {editando && (
          <>
            <Formulario
              inicial={editando}
              onGuardar={(d) => datos.editar(editando.id, d)}
              onHecho={() => setEditando(null)}
            />
            <div className="peligro">
              <button
                type="button"
                className="enlace borrar"
                onClick={async () => {
                  /* Sin `confirm()`: bloquea el hilo y en algunos navegadores
                     ni se muestra. Se pide la confirmación en la propia
                     interfaz, que además se puede leer con lector de pantalla. */
                  setEditando(null);
                  await datos.borrar(editando.id).catch(() => {});
                }}
              >
                Borrar esta candidatura
              </button>
              <span className="pista">Se borra también su historial.</span>
            </div>
          </>
        )}
      </Dialogo>
    </div>
  );
}
