/**
 * Exportación del tablero a CSV.
 *
 * Separador ";" y BOM UTF-8 al principio, no "," a secas: Excel con
 * configuración regional española usa la coma como separador decimal, abre
 * un CSV con comas todo en una sola columna y, sin el BOM, rompe las tildes.
 * Así el archivo se abre bien con doble clic en Excel, LibreOffice y Numbers.
 */

import type { Estado, Postulacion } from './api/tipos';

const NOMBRE_ESTADO: Record<Estado, string> = {
  guardada: 'Por enviar',
  postulada: 'Enviada',
  respuesta: 'Contestaron',
  entrevista: 'Entrevista',
  prueba: 'Prueba técnica',
  oferta: 'Oferta',
  rechazo: 'Cerrada',
  retirada: 'Retirada',
};

const COLUMNAS: Array<[string, (p: Postulacion) => string | number | null]> = [
  ['Puesto', (p) => p.puesto],
  ['Empresa', (p) => p.empresa],
  ['Estado', (p) => NOMBRE_ESTADO[p.estado] ?? p.estado],
  ['Desde', (p) => p.estado_desde?.slice(0, 10) ?? null],
  ['Postulada el', (p) => p.postulado_en.slice(0, 10)],
  ['Modalidad', (p) => p.modalidad],
  ['Ubicación', (p) => p.ubicacion],
  ['Salario mínimo', (p) => p.salario_min],
  ['Salario máximo', (p) => p.salario_max],
  ['Moneda', (p) => p.moneda],
  ['Fuente', (p) => p.fuente],
  ['Enlace', (p) => p.url_oferta],
  ['Notas', (p) => p.notas],
];

function celda(valor: string | number | null): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  // Entre comillas si lleva separador, comillas o saltos de línea; las
  // comillas internas se duplican, que es como lo exige el formato.
  return /[;"\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function aCsv(postulaciones: Postulacion[]): string {
  const filas = [
    COLUMNAS.map(([titulo]) => titulo),
    ...postulaciones.map((p) => COLUMNAS.map(([, valor]) => celda(valor(p)))),
  ];
  return '﻿' + filas.map((fila) => fila.join(';')).join('\r\n') + '\r\n';
}

export function descargarCsv(postulaciones: Postulacion[]): void {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([aCsv(postulaciones)], { type: 'text/csv;charset=utf-8' }));
  enlace.download = `candidaturas-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  // Se libera en el siguiente ciclo: revocarlo en el mismo tick puede
  // cancelar la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}
