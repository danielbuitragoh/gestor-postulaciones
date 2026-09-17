import { ProveedorSesion, useSesion } from './estado/sesion';
import { Acceso } from './paginas/Acceso';
import { Panel } from './paginas/Panel';

function Raiz() {
  const { usuario, cargando } = useSesion();

  /* Mientras se canjea el token de refresco no se enseña NADA de las dos
     pantallas. Enseñar el login aquí haría que cada recarga con sesión válida
     mostrase un destello del formulario antes de saltar al tablero. */
  if (cargando) {
    return (
      <div className="cargando-inicial" role="status">
        <span className="solo-lectores">Comprobando tu sesión…</span>
      </div>
    );
  }

  return usuario ? <Panel /> : <Acceso />;
}

export default function App() {
  return (
    <ProveedorSesion>
      <Raiz />
    </ProveedorSesion>
  );
}
