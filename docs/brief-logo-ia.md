# Brief para generar logo con IA

Documento de referencia para diseñar el logo de **Censo Infantil & Historia Clínica** con herramientas de IA (Midjourney, DALL·E, Ideogram, Adobe Firefly, Recraft, etc.) o con un diseñador humano.

---

## 1. Resumen ejecutivo

| Campo | Valor |
|-------|-------|
| **Nombre público** | Censo Infantil & Historia Clínica |
| **Nombre corto** | Censo Infantil |
| **Etiqueta en cabecera** | CENSO & REGISTRO |
| **Nombre del repositorio** | kids-alive (solo técnico; no usar en el logo salvo indicación explícita) |
| **Qué es** | App web móvil para censo pediátrico comunitario e historia clínica en campo |
| **Quién la usa** | Personal médico, administradores y equipos de salud en campañas comunitarias |
| **Idioma de la marca** | Español (Latinoamérica) |
| **Sensación deseada** | Confiable, cálida, moderna, clínica pero humana, orientada a la privacidad |

---

## 2. Propósito y contexto

La aplicación permite:

- Registrar niños y niñas en campañas de salud (datos personales, vivienda, vacunación, nutrición, escolaridad).
- Mantener historia clínica con notas de consulta.
- Asociar registros a centros de acopio con geolocalización.
- Ver estadísticas agregadas según el rol del usuario.
- Operar con acceso protegido por roles (personal médico, admin, super admin).

**El logo debe comunicar salud infantil comunitaria y datos protegidos**, no entretenimiento infantil ni hospital de lujo. Es herramienta de trabajo en campo, usada en teléfonos, a veces con conectividad limitada.

---

## 3. Personalidad de marca

### Sí — transmitir

- Cuidado y protección de la infancia
- Profesionalismo médico accesible
- Seguridad y confidencialidad de datos
- Claridad y legibilidad en pantallas pequeñas
- Calidez humana (comunidad, campo, familias)

### No — evitar

- Estética de juego, caricatura exagerada o “app para niños”
- Símbolos genéricos de hospital (cruz roja clínica, estetoscopio solo)
- Imágenes realistas de menores (privacidad y sensibilidad)
- Gradientes recargados, neón o estilo “startup crypto”
- Demasiado detalle que no escale a 32×32 px (favicon)
- Referencias políticas, religiosas o de una sola institución

---

## 4. Paleta de colores (alineada con la UI actual)

Usar estos valores para mantener coherencia con la app desplegada.

| Rol | Color | Hex | Uso en UI |
|-----|-------|-----|-----------|
| **Primario** | Azul institucional | `#2563eb` | Botones, icono PWA, theme-color |
| **Primario oscuro** | Azul profundo | `#1e40af` | Acentos, sombras del icono actual |
| **Primario claro** | Azul suave | `#93c5fd` | Detalles secundarios |
| **Fondo** | Gris pizarra claro | `#f8fafc` | Fondo general (`slate-50`) |
| **Texto** | Gris oscuro | `#1e293b` | Texto principal (`slate-800`) |
| **Acento alerta** | Ámbar | `#fbbf24` | Avisos (uso puntual, no dominante) |

**Proporción sugerida en el logo:** 70 % azul primario, 20 % blanco o espacio negativo, 10 % acento o gris.

**Versiones requeridas:**

- Color sobre fondo claro (`#f8fafc` o blanco)
- Color sobre fondo oscuro (blanco o azul claro sobre `#1e293b`)
- Monocromo negro para impresión y SVG de una sola tinta

---

## 5. Tipografía de la app (referencia, no obligatoria en el isotipo)

| Uso | Fuente |
|-----|--------|
| Interfaz | **Inter** (sans-serif humanista, legible en móvil) |
| Badges / etiquetas técnicas | **JetBrains Mono** (monoespaciada) |

Si el logo incluye texto, preferir sans-serif limpia similar a Inter: redondeada pero profesional, sin serifas decorativas.

---

## 6. Direcciones creativas (elegir 1–2)

### A. Isotipo abstracto — “Círculo de cuidado”
Forma circular o semicircular que sugiere comunidad + protección. Puede integrar una silueta estilizada de infante (geométrica, no realista) o dos arcos que se abrazan.

### B. Isotipo — “Registro / ficha”
Hoja o portapapeles simplificado con una marca de “corazón” o “check” de salud. Coherente con el icono PWA actual (clipboard sobre azul redondeado).

### C. Isotipo — “Mapa + punto de acopio”
Pin de mapa estilizado con elemento infantil abstracto (estrella, hoja, brote). Refuerza el trabajo en campo y centros de acopio.

### D. Logotipo tipográfico
“Censo Infantil” o “CENSO” en mayúsculas con tracking amplio; isotipo pequeño a la izquierda. Útil para cabecera web donde ya aparece texto aparte.

### E. Símbolo dual — “Datos + vida”
Línea de pulso o gráfica mínima fusionada con una figura humana infantil geométrica. Cuidado: no parecer app de fitness.

**Recomendación:** priorizar **B o A** por legibilidad en favicon y coherencia con `public/icon.svg`.

---

## 7. Especificaciones técnicas de entrega

| Asset | Tamaño / formato | Notas |
|-------|------------------|-------|
| Logo horizontal | SVG + PNG @2x | Proporción ~1.8:1 (ej. 600×327); usado en cabecera con `h-9` (~36 px alto) |
| Isotipo solo | SVG 512×512 | Favicon, PWA, app icon |
| Fondo | Transparente | Obligatorio para cabecera blanca |
| Trazos | Preferir formas sólidas | Evitar degradados que no exporten bien a SVG |
| Grosor mínimo | ≥ 2 px a 32×32 | Debe leerse en pestaña del navegador |

**Archivos destino en el proyecto:**

- `public/logo.svg` — logo horizontal en cabecera
- `public/icon.svg` — icono cuadrado para PWA y favicon

---

## 8. Prompts listos para copiar

Sustituye `[ESTILO]` por: `flat vector`, `minimal geometric`, `modern healthcare app icon` o `soft rounded corporate`.

### 8.1 Isotipo (icono cuadrado)

```
Minimal app icon for a pediatric community health census platform.
Abstract symbol combining child protection and medical record: soft rounded shapes,
clipboard or shield motif, NO realistic child faces, NO red cross hospital cliché.
Primary color #2563eb blue, white accents, clean flat vector, high contrast.
Square format, centered, generous padding, suitable for 512x512 favicon.
Professional, warm, trustworthy, Latin American public health context.
Background transparent or solid #2563eb with white symbol.
--no text, no photograph, no 3D, no gradient noise, no cartoon mascot
```

### 8.2 Logo horizontal (símbolo + texto)

```
Horizontal logo for "Censo Infantil", Spanish pediatric census and clinical records app.
Left: simple geometric icon (protected child / health record / community care).
Right: wordmark "Censo Infantil" in clean sans-serif similar to Inter font.
Colors: #2563eb blue and #1e293b dark slate on white background.
Flat vector, medical-community tone, privacy-first, mobile-first healthcare.
Wide layout 3:1 ratio, minimal detail, scalable SVG style.
--no stock photo, no stethoscope only, no playful kids app aesthetic
```

### 8.3 Variante solo símbolo (máxima simplicidad)

```
Ultra-simple single-color logo mark for pediatric community health census.
One or two geometric shapes maximum: circle + small human silhouette OR clipboard with heart dot.
Color #2563eb, flat, 2D, works at 32px size, transparent background.
```

### 8.4 Negativo para fondos oscuros

```
Same pediatric census icon mark, inverted: white symbol on #1e293b dark slate,
flat vector, no shadows, favicon-ready.
```

### 8.5 Parámetros útiles por herramienta

| Herramienta | Sugerencia |
|-------------|------------|
| **Midjourney** | Añadir `--style raw`, relación `--ar 1:1` (icono) o `--ar 3:1` (horizontal) |
| **DALL·E / ChatGPT** | Pedir “vector-style flat illustration, solid colors, no text unless specified” |
| **Ideogram** | Activar modo Logo; incluir texto “Censo Infantil” solo si se prueba logotipo completo |
| **Recraft / SVG** | Pedir export SVG con paleta fija `#2563eb`, `#ffffff`, `#1e293b` |

---

## 9. Checklist de evaluación

Antes de adoptar un logo generado por IA, comprobar:

- [ ] ¿Se entiende a 32×32 px (pestaña del navegador)?
- [ ] ¿Funciona en cabecera blanca sin borde ni fondo cuadrado duro?
- [ ] ¿Evita parecer app de juegos o clínica privada elitista?
- [ ] ¿Usa la paleta azul institucional o se puede recolorear fácilmente?
- [ ] ¿No incluye rostros realistas de niños?
- [ ] ¿El SVG resultante es simple (pocos paths) y ligero?
- [ ] ¿Se distingue de iconos genéricos de “medical cross” o “heart rate”?
- [ ] ¿El texto (si lleva) es legible en español y sin errores ortográficos?

---

## 10. Post-proceso recomendado (después de la IA)

La IA rara vez entrega SVG óptimo de primera. Pasos habituales:

1. **Vectorizar** en Figma, Illustrator o [vectorizer.io](https://vectorizer.io) si solo hay PNG.
2. **Simplificar paths** (menos nodos, formas sólidas).
3. **Ajustar colores** a los hex de la sección 4.
4. **Probar** en `AuthScreen` y cabecera de `App.tsx` a ~36 px de alto.
5. **Exportar** `logo.svg` (horizontal) e `icon.svg` (512×512, esquinas redondeadas opcionales `rx="104"` como el icono actual).

---

## 11. Referencia visual actual

| Asset | Descripción |
|-------|-------------|
| `public/icon.svg` | Cuadrado azul `#2563eb`, esquinas redondeadas, silueta de ficha/documento en blanco |
| `public/logo.svg` | Ilustración detallada en negro (candidata a reemplazo por algo más simple y en color de marca) |
| UI login | Fondos `slate-50`, acentos `blue-600`, badge “Privacidad primero” |
| `manifest.json` | `theme_color`: `#2563eb`, `background_color`: `#f8fafc` |

---

## 12. Mensaje en una frase (para brief corto)

> Logo para app española de censo pediátrico comunitario e historia clínica: profesional, cálido, azul #2563eb, protección de datos y salud infantil en campo; icono simple que escale a favicon; sin caricaturas ni fotos de niños.

---

*Última actualización: junio 2026 — alineado con la UI en `src/` y assets en `public/`.*
