import { describe, expect, it } from 'vitest';
import { countLabelTranscriptFields, parseLabelTranscript } from './parseLabelTranscript';

describe('parseLabelTranscript', () => {
  it('parsea líneas Etiqueta: valor', () => {
    const draft = parseLabelTranscript(`Nombres: María
Apellidos: García
Edad años: 5
Centro: Centro Salud Chacao
Género: femenino`);

    expect(draft.fields.nombres?.value).toBe('María');
    expect(draft.fields.edadAnios?.value).toBe(5);
    expect(draft.fields.centroAcopioNombre?.value).toBe('Centro Salud Chacao');
    expect(draft.fields.genero?.value).toBe('femenino');
  });

  it('parsea frases separadas por punto', () => {
    const draft = parseLabelTranscript(
      'Nombres: Luis. Apellidos: Pérez. Edad años: 8. Teléfono: 0412-1112233'
    );
    expect(draft.fields.nombres?.value).toBe('Luis');
    expect(draft.fields.telefonoPrincipal?.value).toBe('0412-1112233');
  });

  it('interpreta alergias sí/no', () => {
    const noAlergias = parseLabelTranscript('Nombres: Ana. Alergias: No');
    expect(noAlergias.fields.tieneAlergias?.value).toBe(false);

    const siAlergias = parseLabelTranscript('Alergias: Penicilina');
    expect(siAlergias.fields.tieneAlergias?.value).toBe(true);
    expect(siAlergias.fields.alergiasEspecificas?.value).toBe('Penicilina');
  });

  it('cuenta campos detectados', () => {
    expect(
      countLabelTranscriptFields('Nombres: X. Apellidos: Y. Edad años: 3')
    ).toBeGreaterThanOrEqual(3);
  });
});
