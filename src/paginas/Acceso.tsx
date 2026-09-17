/** Entrar o crear cuenta. Un solo formulario con dos modos. */

import { useState, type FormEvent } from 'react';
import { useSesion } from '../estado/sesion';
import { ErrorApi } from '../api/tipos';

export function Acceso() {
  const { api, entrar } = useSesion();
  const [modo, setModo] = useState<'acceso' | 'registro'>('acceso');
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true); setErrores({}); setGeneral(null);

    const f = new FormData(e.currentTarget);
    const email = String(f.get('email') ?? '');
    const contrasena = String(f.get('contrasena') ?? '');
    const nombre = String(f.get('nombre') ?? '');

    try {
      const s = modo === 'registro'
        ? await api.registro({ email, contrasena, nombre })
        : await api.acceso({ email, contrasena });
      entrar(s.usuario, s.acceso, s.refresco);
    } catch (err) {
      if (err instanceof ErrorApi && err.detalles?.length) setErrores(err.porCampo());
      else setGeneral(err instanceof Error ? err.message : 'No se pudo completar');
      setEnviando(false);
    }
  }

  return (
    <main className="acceso">
      <div className="caja">
        <h1>Gestor de candidaturas</h1>
        <p className="lema">
          Un tablero para saber por dónde va cada proceso y cuánto llevan sin contestar.
        </p>

        <form onSubmit={enviar} noValidate>
          {general && <p className="aviso-error" role="alert">{general}</p>}

          {modo === 'registro' && (
            <label className="campo">
              <span>Nombre</span>
              <input name="nombre" required autoComplete="name" />
              {errores['nombre'] && <em className="error">{errores['nombre']}</em>}
            </label>
          )}

          <label className="campo">
            <span>Correo</span>
            <input name="email" type="email" required autoComplete="email" />
            {errores['email'] && <em className="error">{errores['email']}</em>}
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input
              name="contrasena"
              type="password"
              required
              /* El valor correcto de autocomplete importa: con él, el gestor de
                 contraseñas ofrece guardarla al registrarse y rellenarla al
                 entrar. Con el genérico, ni una cosa ni la otra. */
              autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              minLength={modo === 'registro' ? 12 : undefined}
            />
            {errores['contrasena']
              ? <em className="error">{errores['contrasena']}</em>
              : modo === 'registro' && <em className="pista">Al menos 12 caracteres. Larga importa más que rara.</em>}
          </label>

          <button type="submit" className="boton principal ancho" disabled={enviando}>
            {enviando ? 'Un momento…' : modo === 'registro' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="cambiar">
          {modo === 'acceso' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button type="button" className="enlace" onClick={() => { setModo(modo === 'acceso' ? 'registro' : 'acceso'); setErrores({}); setGeneral(null); }}>
            {modo === 'acceso' ? 'Crear una' : 'Entrar'}
          </button>
        </p>
      </div>
    </main>
  );
}
