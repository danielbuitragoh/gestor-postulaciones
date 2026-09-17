/**
 * Diálogo modal sobre `<dialog>` nativo.
 *
 * El elemento nativo trae gratis lo que una implementación a mano casi siempre
 * se deja: el foco atrapado dentro mientras está abierto, la tecla Escape, el
 * fondo inerte para el lector de pantalla y la capa superior sin pelearse con
 * z-index. Reimplementar eso con un <div> es cómo se producen los modales que
 * dejan tabular a los enlaces de detrás.
 */

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

export function Dialogo({ abierto, titulo, onCerrar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className="dialogo"
      aria-labelledby="titulo-dialogo"
      /* `close` cubre también el cierre con Escape, que no pasa por el botón.
         Sin esto el diálogo se cierra visualmente pero React sigue creyendo
         que está abierto y no vuelve a abrirse. */
      onClose={onCerrar}
      onClick={(e) => { if (e.target === ref.current) onCerrar(); }}
    >
      <header>
        <h2 id="titulo-dialogo">{titulo}</h2>
        <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
      </header>
      <div className="cuerpo">{children}</div>
    </dialog>
  );
}
