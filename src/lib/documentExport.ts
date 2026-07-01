import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_NAME, PATIENT_FILE_LABEL } from '../brand';
import type { PatientExportTier } from './authRoles';
import type { Paciente } from '../types';
import {
  edadPacienteTexto,
  grupoEtarioLabel,
  pacienteRequiereRepresentante,
  puntoRegistroEtiqueta,
  resolveGrupoEtario,
  tituloHistoriaClinica,
} from '../types';
import { getPatientPhotoUrl } from './patientPhotosApi';

export type { PatientExportTier };

export type DocumentExportFormat = 'pdf' | 'csv';

const LIST_HEADERS = [
  'Nombres',
  'Apellidos',
  'Edad',
  'Clasificación',
  'Vacunación',
  'Punto de captura',
  'Ciudad',
  'Fecha registro',
] as const;

const A4_BOTTOM = 285;

export function sanitizeExportSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export function exportDateStamp(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function patientListRow(p: Paciente): string[] {
  return [
    p.nombres,
    p.apellidos,
    edadPacienteTexto(p),
    grupoEtarioLabel(resolveGrupoEtario(p)),
    p.esquemaVacunacion,
    puntoRegistroEtiqueta(p),
    p.ciudadMunicipio,
    p.fechaRegistro,
  ];
}

export function buildPatientListCsv(patients: Paciente[]): string {
  const lines = [
    LIST_HEADERS.join(','),
    ...patients.map((p) => patientListRow(p).map(escapeCsvCell).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function healthLine(p: Paciente, flag: boolean, text: string): string {
  if (!flag || !text.trim()) return 'No reportado';
  return text.trim();
}

function formatAuditCoords(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return '—';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function exportDocumentTitle(patient: Paciente, tier: PatientExportTier): string {
  if (tier === 'asistente') return PATIENT_FILE_LABEL;
  if (tier === 'admin') return `${tituloHistoriaClinica(patient)} · auditoría`;
  return tituloHistoriaClinica(patient);
}

function pdfField(doc: jsPDF, label: string, value: string, x: number, y: number, width: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(value || '—', width);
  doc.text(lines, x, y + 4);
  return y + 4 + lines.length * 4.2 + 2;
}

function pdfSectionTitle(doc: jsPDF, title: string, x: number, y: number, width: number): number {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + width, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(29, 78, 216);
  doc.text(title.toUpperCase(), x, y + 6);
  return y + 12;
}

function ensurePdfSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  if (y + needed > A4_BOTTOM) {
    doc.addPage();
    return margin + 8;
  }
  return y;
}

function addPdfFields(
  doc: jsPDF,
  fields: [string, string][],
  margin: number,
  y: number,
  contentW: number
): number {
  const colW = (contentW - 4) / 2;
  const leftX = margin;
  const rightX = margin + colW + 4;
  let yLeft = y;
  let yRight = y;

  for (let i = 0; i < fields.length; i++) {
    const [label, value] = fields[i];
    if (i % 2 === 0) {
      yLeft = ensurePdfSpace(doc, yLeft, 14, margin);
      yLeft = pdfField(doc, label, value, leftX, yLeft, colW);
    } else {
      yRight = ensurePdfSpace(doc, yRight, 14, margin);
      yRight = pdfField(doc, label, value, rightX, yRight, colW);
    }
  }
  return Math.max(yLeft, yRight) + 4;
}

async function drawPdfHeader(
  doc: jsPDF,
  patient: Paciente,
  title: string,
  margin: number,
  pageW: number
): Promise<void> {
  const headerH = 32;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, headerH, 'F');

  doc.setTextColor(191, 219, 254);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(APP_NAME.toUpperCase(), margin, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), pageW - margin * 2 - 28);
  doc.text(titleLines, margin, 18);

  if (patient.fotoPath) {
    const photoUrl = await getPatientPhotoUrl(patient.fotoPath);
    const dataUrl = photoUrl ? await fetchImageDataUrl(photoUrl) : null;
    if (dataUrl) {
      doc.addImage(dataUrl, 'JPEG', pageW - margin - 24, 4, 24, 24);
    }
  }
}

async function exportPatientCardPdfAsistente(patient: Paciente, title: string): Promise<void> {
  const pageW = 100;
  const pageH = 150;
  const doc = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait' });
  const margin = 8;
  const contentW = pageW - margin * 2;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 30, 'F');

  doc.setTextColor(191, 219, 254);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(APP_NAME.toUpperCase(), margin, 9);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), margin, 16);

  const photoX = pageW - margin - 22;
  if (patient.fotoPath) {
    const photoUrl = await getPatientPhotoUrl(patient.fotoPath);
    const dataUrl = photoUrl ? await fetchImageDataUrl(photoUrl) : null;
    if (dataUrl) {
      doc.addImage(dataUrl, 'JPEG', photoX, 6, 22, 22);
    }
  }

  let y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(patient.nombres, margin, y);
  y += 6;
  doc.setFontSize(15);
  doc.text(patient.apellidos, margin, y);
  y += 10;

  y = addPdfFields(
    doc,
    [
      ['Edad', edadPacienteTexto(patient)],
      ['Género', patient.genero],
      ['Clasificación', grupoEtarioLabel(resolveGrupoEtario(patient))],
      ['Nacionalidad', patient.nacionalidad],
      ['Vacunación', `Esquema ${patient.esquemaVacunacion}`],
      ['Estatura', patient.estatura > 0 ? `${patient.estatura} cm` : '—'],
      ['Peso', patient.peso > 0 ? `${patient.peso} kg` : '—'],
    ],
    margin,
    y,
    contentW
  );

  const capturePoint = puntoRegistroEtiqueta(patient);
  if (capturePoint) {
    y = pdfField(doc, 'Punto de captura', capturePoint, margin, y, contentW);
  }

  if (patient.ciudadMunicipio) {
    y = pdfField(doc, 'Ciudad', patient.ciudadMunicipio, margin, y, contentW);
  }

  if (pacienteRequiereRepresentante(patient) && patient.nombreRepresentante) {
    y = pdfField(
      doc,
      'Representante',
      `${patient.nombreRepresentante} (${patient.parentesco || 'tutor'})`,
      margin,
      y,
      contentW
    );
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Censo: ${patient.fechaRegistro}`, margin, pageH - 8);
  doc.text(`Generado: ${exportDateStamp()}`, pageW - margin, pageH - 8, { align: 'right' });

  savePatientPdf(doc, patient);
}

async function exportPatientCardPdfFull(
  patient: Paciente,
  title: string,
  options: { includeAudit?: boolean; registradoPorName?: string | null } = {}
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - margin * 2;

  await drawPdfHeader(doc, patient, title, margin, pageW);

  let y = 42;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${patient.nombres} ${patient.apellidos}`, margin, y);
  y += 10;

  y = pdfSectionTitle(doc, 'Datos personales', margin, y, contentW);
  y = addPdfFields(
    doc,
    [
      ['Nombres', patient.nombres],
      ['Apellidos', patient.apellidos],
      ['Documento', patient.documentoIdentidad || '—'],
      ['Fecha de nacimiento', patient.fechaNacimiento || '—'],
      ['Edad', edadPacienteTexto(patient)],
      ['Género', patient.genero],
      ['Clasificación etaria', grupoEtarioLabel(resolveGrupoEtario(patient))],
      ['Nacionalidad', patient.nacionalidad],
    ],
    margin,
    y,
    contentW
  );

  y = ensurePdfSpace(doc, y, 20, margin);
  y = pdfSectionTitle(doc, 'Captura', margin, y, contentW);
  y = addPdfFields(
    doc,
    [
      ['Fecha de registro', patient.fechaRegistro],
      ['Punto de captura', puntoRegistroEtiqueta(patient) || '—'],
    ],
    margin,
    y,
    contentW
  );

  y = ensurePdfSpace(doc, y, 20, margin);
  y = pdfSectionTitle(doc, 'Vivienda y dirección', margin, y, contentW);
  y = addPdfFields(
    doc,
    [
      ['Dirección', patient.direccion || '—'],
      ['Punto de referencia', patient.puntoReferencia || '—'],
      ['Ciudad / municipio', patient.ciudadMunicipio || '—'],
      ['Estado / provincia', patient.estadoProvincia || '—'],
    ],
    margin,
    y,
    contentW
  );

  y = ensurePdfSpace(doc, y, 20, margin);
  y = pdfSectionTitle(doc, 'Salud y nutrición', margin, y, contentW);
  y = addPdfFields(
    doc,
    [
      ['Estatura', patient.estatura > 0 ? `${patient.estatura} cm` : '—'],
      ['Peso', patient.peso > 0 ? `${patient.peso} kg` : '—'],
      ['Grupo sanguíneo', patient.grupoSanguineo || '—'],
      ['Vacunación', `Esquema ${patient.esquemaVacunacion}`],
      ['Alergias', healthLine(patient, patient.tieneAlergias, patient.alergiasEspecificas)],
      ['Condición médica', healthLine(patient, patient.tieneCondicionMedica, patient.condicionMedicaEspecifica)],
      ['Medicación', healthLine(patient, patient.tomaMedicamentos, patient.medicamentosEspecificos)],
    ],
    margin,
    y,
    contentW
  );

  if (pacienteRequiereRepresentante(patient)) {
    y = ensurePdfSpace(doc, y, 20, margin);
    y = pdfSectionTitle(doc, 'Representante legal', margin, y, contentW);
    y = addPdfFields(
      doc,
      [
        ['Nombre', patient.nombreRepresentante || '—'],
        ['Parentesco', patient.parentesco || '—'],
        ['Documento', patient.documentoRepresentante || '—'],
        ['Ocupación', patient.ocupacion || '—'],
        ['Teléfono principal', patient.telefonoPrincipal || '—'],
        ['Teléfono de emergencias', patient.telefonoEmergencias || '—'],
        ['Correo', patient.correo || '—'],
      ],
      margin,
      y,
      contentW
    );
  }

  if (patient.asisteEscuela || patient.nombreInstitucion || patient.nivelEducativo) {
    y = ensurePdfSpace(doc, y, 20, margin);
    y = pdfSectionTitle(doc, 'Datos educativos', margin, y, contentW);
    y = addPdfFields(
      doc,
      [
        ['Asiste a escuela', patient.asisteEscuela ? 'Sí' : 'No'],
        ['Nivel educativo', patient.nivelEducativo || '—'],
        ['Grado / año', patient.gradoAnio || '—'],
        ['Institución', patient.nombreInstitucion || '—'],
      ],
      margin,
      y,
      contentW
    );
  }

  if (patient.notasClinicas.length > 0) {
    y = ensurePdfSpace(doc, y, 24, margin);
    y = pdfSectionTitle(doc, 'Evolución clínica', margin, y, contentW);

    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Peso', 'Talla', 'Motivo', 'Diagnóstico', 'Tratamiento']],
      body: patient.notasClinicas.map((note) => [
        note.fecha,
        note.peso > 0 ? `${note.peso} kg` : '—',
        note.estatura > 0 ? `${note.estatura} cm` : '—',
        note.motivo || '—',
        note.diagnostico || '—',
        note.tratamiento || '—',
      ]),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 16 },
        2: { cellWidth: 16 },
      },
      margin: { left: margin, right: margin },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 8;
  }

  if (options.includeAudit) {
    y = ensurePdfSpace(doc, y, 28, margin);
    y = pdfSectionTitle(doc, 'Auditoría de captura', margin, y, contentW);
    y = addPdfFields(
      doc,
      [
        ['Registrado por', options.registradoPorName || patient.registradoPorId || '—'],
        ['Fecha de registro', patient.fechaRegistro],
        ['ID interno', patient.id],
        ['ID centro de acopio', patient.centroAcopioId || '—'],
        ['Coord. paciente', formatAuditCoords(patient.registroLat, patient.registroLng)],
        ['Coord. centro', formatAuditCoords(patient.centroAcopioLat, patient.centroAcopioLng)],
        ['Coord. capturista', formatAuditCoords(patient.registrantLat, patient.registrantLng)],
      ],
      margin,
      y,
      contentW
    );
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado: ${exportDateStamp()}`, margin, pageH - 8);
    doc.text(`Página ${page} de ${pageCount}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  savePatientPdf(doc, patient);
}

function savePatientPdf(doc: jsPDF, patient: Paciente): void {
  const slug = sanitizeExportSlug(`${patient.apellidos}_${patient.nombres}`) || patient.id;
  doc.save(`cividata_ficha_${slug}_${exportDateStamp()}.pdf`);
}

export type PatientCardExportOptions = {
  exportTier?: PatientExportTier;
  registradoPorName?: string | null;
};

export async function exportPatientCardPdf(
  patient: Paciente,
  options: PatientCardExportOptions = {}
): Promise<void> {
  const tier = options.exportTier ?? 'asistente';
  const title = exportDocumentTitle(patient, tier);

  if (tier === 'asistente') {
    await exportPatientCardPdfAsistente(patient, title);
    return;
  }

  await exportPatientCardPdfFull(patient, title, {
    includeAudit: tier === 'admin',
    registradoPorName: options.registradoPorName,
  });
}

export async function exportPatientListPdf(
  patients: Paciente[],
  options: { title?: string } = {}
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const title = options.title ?? 'Listado de pacientes';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(APP_NAME, 14, 14);
  doc.setFontSize(11);
  doc.text(title, 14, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`${patients.length} registro(s) · ${exportDateStamp()}`, 14, 28);

  autoTable(doc, {
    startY: 34,
    head: [LIST_HEADERS.slice()],
    body: patients.map(patientListRow),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`cividata_listado_${exportDateStamp()}.pdf`);
}

export async function exportPatientList(
  patients: Paciente[],
  format: DocumentExportFormat,
  options: { title?: string } = {}
): Promise<void> {
  if (patients.length === 0) {
    throw new Error('No hay pacientes para exportar.');
  }
  if (format === 'csv') {
    downloadTextFile(
      `cividata_listado_${exportDateStamp()}.csv`,
      buildPatientListCsv(patients),
      'text/csv;charset=utf-8'
    );
    return;
  }
  await exportPatientListPdf(patients, options);
}
