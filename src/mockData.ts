/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Paciente } from './types';

export const INITIAL_PACIENTES: Paciente[] = [
  {
    id: "pac-1",
    nombres: "Mateo Alejandro",
    apellidos: "Gómez Rodríguez",
    fechaNacimiento: "2021-04-12",
    edadAnios: 5,
    edadMeses: 2,
    genero: "Masculino",
    documentoIdentidad: "V-32.901.884",
    nacionalidad: "Venezolana",
    
    direccion: "Av. Las Flores, Res. El Girasol, Apto 4B",
    ciudadMunicipio: "Chacao",
    estadoProvincia: "Miranda",
    puntoReferencia: "Frente a la Plaza Bolívar",
    
    nombreRepresentante: "María Carolina Rodríguez",
    parentesco: "Madre",
    documentoRepresentante: "V-18.452.190",
    ocupacion: "Diseñadora Gráfica",
    telefonoPrincipal: "+58 412-5551234",
    telefonoEmergencias: "+58 414-9994321",
    correo: "mrodriguez@email.com",
    
    estatura: 108,
    peso: 18.5,
    grupoSanguineo: "O Rh Positivo (O+)",
    tieneAlergias: true,
    alergiasEspecificas: "Amoxicilina e intolerancia leve a la lactosa.",
    tieneCondicionMedica: false,
    condicionMedicaEspecifica: "",
    tomaMedicamentos: false,
    medicamentosEspecificos: "",
    esquemaVacunacion: "Completo",
    
    asisteEscuela: true,
    nivelEducativo: "Preescolar / Inicial",
    gradoAnio: "Tercer Grupo",
    nombreInstitucion: "Colegio Infantil Mi Segundo Hogar",
    
    fechaRegistro: "2026-01-10",
    notasClinicas: [
      {
        id: "note-1-1",
        fecha: "2026-01-10",
        peso: 17.2,
        estatura: 106,
        motivo: "Control de niño sano y censo de rutina",
        diagnostico: "Desarrollo pondoestatural adecuado para la edad. Nutrición óptima.",
        tratamiento: "Continuar con alimentación balanceada. Suplementar con Vitamina D según pauta estacional."
      },
      {
        id: "note-1-2",
        fecha: "2026-04-15",
        peso: 18.5,
        estatura: 108,
        motivo: "Fiebre alta y tos seca",
        diagnostico: "Infección respiratoria alta de origen viral (gripe común)",
        tratamiento: "Acetaminofén 150mg cada 6 horas en caso de fiebre superior a 38.3°C. Hidratación abundante. Lavados nasales con solución fisiológica. Reposo escolar por 3 días."
      }
    ]
  },
  {
    id: "pac-2",
    nombres: "Sofía Valentina",
    apellidos: "Martínez Silva",
    fechaNacimiento: "2023-08-25",
    edadAnios: 2,
    edadMeses: 10,
    genero: "Femenino",
    documentoIdentidad: "V-34.112.502",
    nacionalidad: "Venezolana",
    
    direccion: "Calle Carabobo, Casa Nro 12-B",
    ciudadMunicipio: "Baruta",
    estadoProvincia: "Miranda",
    puntoReferencia: "Al lado de la Panadería El Sol",
    
    nombreRepresentante: "Carlos Eduardo Martínez",
    parentesco: "Padre",
    documentoRepresentante: "V-15.632.782",
    ocupacion: "Ingeniero Mecánico",
    telefonoPrincipal: "+58 416-2228833",
    telefonoEmergencias: "+58 424-3331100",
    correo: "carlos.martinez@email.com",
    
    estatura: 92,
    peso: 13.2,
    grupoSanguineo: "A Rh Positivo (A+)",
    tieneAlergias: false,
    alergiasEspecificas: "",
    tieneCondicionMedica: true,
    condicionMedicaEspecifica: "Asma infantil diagnosticada a los 18 meses.",
    tomaMedicamentos: true,
    medicamentosEspecificos: "Salbutamol inhalador (1 puf de rescate si presenta sibilancias/dificultad). Budesonida nocturna.",
    esquemaVacunacion: "Incompleto",
    
    asisteEscuela: true,
    nivelEducativo: "Maternal",
    gradoAnio: "Maternal B",
    nombreInstitucion: "Guardería Maternal Pasitos Firmes",
    
    fechaRegistro: "2026-03-22",
    notasClinicas: [
      {
        id: "note-2-1",
        fecha: "2026-03-22",
        peso: 12.8,
        estatura: 91,
        motivo: "Primera consulta - Alta de historia clínica",
        diagnostico: "Asma bronquial infantil controlada. Ligera deshidratación por cuadro diarreico resuelto.",
        tratamiento: "Mantener terapia con Budesonida. Se indica reponer dosis pendiente de vacuna anti-influenza."
      },
      {
        id: "note-2-2",
        fecha: "2026-06-10",
        peso: 13.2,
        estatura: 92,
        motivo: "Control y revisión de tratamiento para asma",
        diagnostico: "Asma compensada sin crisis recientes en las últimas 6 semanas. Buen progreso de talla.",
        tratamiento: "Continuar esquema de mantenimiento de asma. Agendar vacunación pendiente."
      }
    ]
  },
  {
    id: "pac-3",
    nombres: "Santiago Andrés",
    apellidos: "Alvarado Pérez",
    fechaNacimiento: "2018-11-05",
    edadAnios: 7,
    edadMeses: 7,
    genero: "Masculino",
    documentoIdentidad: "CI-30.221.445",
    nacionalidad: "Colombiana",
    
    direccion: "Sector Las Mininas, Calle C, Bloque 3, Piso 1",
    ciudadMunicipio: "Libertador",
    estadoProvincia: "Distrito Capital",
    puntoReferencia: "Cerca de la Estación del Metro Propatria",
    
    nombreRepresentante: "Elena Pérez de Alvarado",
    parentesco: "Abuelo/a",
    documentoRepresentante: "CI-9.873.112",
    ocupacion: "Pensionada / Cuidadora",
    telefonoPrincipal: "+58 412-1110022",
    telefonoEmergencias: "+58 414-0009988",
    correo: "elena.perez@email.com",
    
    estatura: 122,
    peso: 22.8,
    grupoSanguineo: "O Rh Negativo (O-)",
    tieneAlergias: true,
    alergiasEspecificas: "Picaduras de abejas y frutos secos (maní).",
    tieneCondicionMedica: false,
    condicionMedicaEspecifica: "",
    tomaMedicamentos: false,
    medicamentosEspecificos: "",
    esquemaVacunacion: "Completo",
    
    asisteEscuela: true,
    nivelEducativo: "Primaria",
    gradoAnio: "Segundo Grado",
    nombreInstitucion: "Escuela Básica Nacional Andrés Bello",
    
    fechaRegistro: "2026-02-18",
    notasClinicas: [
      {
        id: "note-3-1",
        fecha: "2026-02-18",
        peso: 22.8,
        estatura: 122,
        motivo: "Censo de salud y examen físico escolar",
        diagnostico: "Paciente sano con crecimiento pondoestatural adecuado. Alerta por alergia grave a frutos secos.",
        tratamiento: "Emitir informe de emergencia escolar indicando portar ampolla de epinefrina autoinyectable en bolso escolar para uso inmediato en caso de shock anafiláctico accidental."
      }
    ]
  },
  {
    id: "pac-4",
    nombres: "Camila Isabella",
    apellidos: "Cárdenas Mendoza",
    fechaNacimiento: "2014-02-28",
    edadAnios: 12,
    edadMeses: 4,
    genero: "Femenino",
    documentoIdentidad: "V-31.554.009",
    nacionalidad: "Venezolana",
    
    direccion: "Urb. Los Chorros, Calle La Llovizna, Quinta Mary",
    ciudadMunicipio: "Sucre",
    estadoProvincia: "Miranda",
    puntoReferencia: "Detrás del canal de televisión Televen",
    
    nombreRepresentante: "Laura Mendoza",
    parentesco: "Tutor legal",
    documentoRepresentante: "V-12.871.304",
    ocupacion: "Abogada",
    telefonoPrincipal: "+58 412-4445566",
    telefonoEmergencias: "+58 412-3332211",
    correo: "lmendoza@email.com",
    
    estatura: 152,
    peso: 41.0,
    grupoSanguineo: "B Rh Positivo (B+)",
    tieneAlergias: false,
    alergiasEspecificas: "",
    tieneCondicionMedica: false,
    condicionMedicaEspecifica: "",
    tomaMedicamentos: false,
    medicamentosEspecificos: "",
    esquemaVacunacion: "Completo",
    
    asisteEscuela: true,
    nivelEducativo: "Secundaria",
    gradoAnio: "Primer Año de Bachillerato",
    nombreInstitucion: "Unidad Educativa Colegio Santiago de León",
    
    fechaRegistro: "2026-05-02",
    notasClinicas: [
      {
        id: "note-4-1",
        fecha: "2026-05-02",
        peso: 41.0,
        estatura: 152,
        motivo: "Evaluación física de rutina y constancia de salud",
        diagnostico: "Adolescente sana, desarrollo adecuado de caracteres sexuales secundarios (Tanner II).",
        tratamiento: "Orientación nutricional. Fomentar actividad deportiva escolar. Suplementación con hierro profiláctico si inicia menarquía."
      }
    ]
  }
];
