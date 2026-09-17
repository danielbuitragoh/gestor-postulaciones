/**
 * El tablero Kanban.
 *
 * Se usa @dnd-kit y no el arrastrar y soltar nativo de HTML5 por una razón
 * concreta: el nativo NO es accesible con teclado. Quien no pueda usar un ratón
 * —o simplemente prefiera el teclado— se queda sin poder mover una tarjeta, que
 * es la acción principal de esta pantalla. @dnd-kit trae un sensor de teclado
 * y anuncios para lector de pantalla.
 *
 * Y aun así, CADA TARJETA lleva además un selector de estado. El arrastrar es
 * la vía rápida, no la única: en un móvil, arrastrar entre columnas que no caben
 * en pantalla es incómodo hasta para quien puede hacerlo.
 */

import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, closestCorners,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { COLUMNAS, ESTADOS, type Estado, type Postulacion } from '../api/tipos';
import { Tarjeta } from './Tarjeta';

interface Props {
  postulaciones: Postulacion[];
  onMover: (id: string, estado: Estado) => void;
  onAbrir: (p: Postulacion) => void;
}

export function Tablero({ postulaciones, onMover, onAbrir }: Props) {
  const [arrastrando, setArrastrando] = useState<Postulacion | null>(null);

  const sensores = useSensors(
    /* 6px antes de considerar que es un arrastre: sin esta distancia, un clic
       con un temblor mínimo se interpreta como arrastre y la tarjeta no se
       abre nunca. */
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  /* Las candidaturas en estados que no tienen columna ('guardada', 'prueba',
     'retirada') se agrupan en la columna más cercana en lugar de desaparecer.
     Un dato que existe y no se ve en ninguna parte es peor que uno mal
     colocado: el usuario lo da por perdido. */
  const columnaDe = (e: Estado): Estado =>
    e === 'guardada' ? 'postulada' : e === 'prueba' ? 'entrevista' : e === 'retirada' ? 'rechazo' : e;

  function alSoltar(ev: DragEndEvent) {
    setArrastrando(null);
    const destino = ev.over?.id;
    const id = String(ev.active.id);
    if (!destino) return;

    const estado = String(destino) as Estado;
    if (!ESTADOS.includes(estado)) return;

    const actual = postulaciones.find((p) => p.id === id);
    if (!actual || columnaDe(actual.estado) === estado) return; // soltada donde estaba

    onMover(id, estado);
  }

  function alEmpezar(ev: DragStartEvent) {
    setArrastrando(postulaciones.find((p) => p.id === String(ev.active.id)) ?? null);
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={alEmpezar}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastrando(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Has cogido la candidatura ${active.id}.`,
          onDragOver: ({ over }) => (over ? `Sobre la columna ${etiqueta(over.id)}.` : 'Fuera de las columnas.'),
          onDragEnd: ({ over }) => (over ? `Soltada en ${etiqueta(over.id)}.` : 'Soltada fuera; sin cambios.'),
          onDragCancel: () => 'Movimiento cancelado.',
        },
      }}
    >
      <div className="tablero">
        {COLUMNAS.map((col) => {
          const dentro = postulaciones.filter((p) => columnaDe(p.estado) === col.estado);
          return (
            <Columna key={col.estado} estado={col.estado} titulo={col.titulo} ayuda={col.ayuda} n={dentro.length}>
              {dentro.map((p) => (
                <Arrastrable key={p.id} id={p.id}>
                  <Tarjeta postulacion={p} onAbrir={() => onAbrir(p)} onMover={onMover} />
                </Arrastrable>
              ))}
              {dentro.length === 0 && <p className="vacia">Nada por aquí</p>}
            </Columna>
          );
        })}
      </div>

      {/* La capa de arrastre pinta la tarjeta bajo el cursor. Sin ella,
          @dnd-kit mueve el nodo original y la columna se reorganiza a saltos
          mientras arrastras. */}
      <DragOverlay dropAnimation={null}>
        {arrastrando && (
          <div className="tarjeta arrastrando">
            <p className="puesto">{arrastrando.puesto}</p>
            <p className="empresa">{arrastrando.empresa}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function etiqueta(id: string | number): string {
  return COLUMNAS.find((c) => c.estado === id)?.titulo ?? String(id);
}

/* ------------------------------------------------------------------ */

function Columna(
  { estado, titulo, ayuda, n, children }:
  { estado: Estado; titulo: string; ayuda: string; n: number; children: React.ReactNode },
) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });

  return (
    <section className={`columna${isOver ? ' encima' : ''}`} ref={setNodeRef} aria-label={`${titulo}, ${n}`}>
      <header>
        <h2>{titulo} <span className="cuenta">{n}</span></h2>
        <p>{ayuda}</p>
      </header>
      <div className="pila">{children}</div>
    </section>
  );
}

function Arrastrable({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        /* La original se atenúa en vez de ocultarse: si desaparece, la columna
           colapsa y las demás tarjetas bailan bajo el cursor. */
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      {children}
    </div>
  );
}
