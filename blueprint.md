# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

---

## Historial de Cambios

### Mejora de la Seguridad Visual del Recibo (Marca de Agua)

**Objetivo:** Aumentar drásticamente la seguridad y la resistencia a la manipulación de los recibos digitales mediante la implementación de un sistema de marca de agua complejo y de alta densidad.

**Funcionalidades Implementadas:**

1.  **Refinamiento de la Marca de Agua Macro (Capa 1):**
    *   Se modificó el componente `WatermarkBackground` en `src/components/sales/Receipt.tsx`.
    *   La marca de agua de texto grande (`macro-text`) ahora se renderiza en 6 líneas para cubrir una mayor área del recibo.
    *   Se introdujo una variación dinámica a cada línea, aplicando un `translateX` y una micro-rotación (`tilt`) únicos, creando un patrón menos predecible.
    *   El formato del texto se estandarizó a `TICKET_ID • TOTAL • ORIGINAL` para mayor claridad.

2.  **Implementación de Marca de Agua Cruzada (Capa 2):**
    *   Para eliminar por completo las "zonas vacías" y dificultar la edición, se duplicó la capa de `macro-text`.
    *   Esta segunda capa se rota en la dirección opuesta (`rotate(30deg)`) con una opacidad ligeramente reducida, creando un patrón de "X" que cubre todo el documento.

3.  **Corrección de Errores y Refactorización Robusta:**
    *   Se identificó y corrigió un `SyntaxError` causado por la falta de comillas invertidas (template literals) en la construcción de una cadena de texto.
    *   Durante la compilación (`npm run build`), se detectó un `TypeError` en `src/lib/ticket-utils.ts` debido a nombres de propiedad inconsistentes (`numero` vs. `number`) en las estructuras de datos de los tickets.
    *   **Solución Profesional:** En lugar de usar un atajo inseguro como `any`, se refactorizó el archivo `ticket-utils.ts` para usar **Type Guards** de TypeScript. Se crearon funciones (`isItemA`, `getNum`, `getQty`) y tipos claros (`TicketItemA`, `TicketItemB`) para normalizar los datos de forma segura, garantizando la integridad de los tipos en todo el flujo.
    *   La lógica ahora unifica el origen de los datos (`ticket.items` o `ticket.numbers`) para un procesamiento consistente.

4.  **Confirmación y Compilación:**
    *   Tras la refactorización, el comando `npm run build` se ejecutó con éxito, confirmando que todos los errores de sintaxis y de tipo fueron resueltos de manera efectiva.

### Implementación de la Página de Finanzas y Reportes PDF

**Objetivo:** Crear una sección de finanzas para que los usuarios puedan analizar sus ventas, calcular comisiones y generar reportes detallados.

**Funcionalidades Implementadas:**

1.  **Creación de la Página `finanzas/page.tsx`:**
    *   **Diseño de Interfaz:** Se implementó una interfaz moderna utilizando `Card` de shadcn/ui para mostrar resúmenes clave:
        *   Tarjeta para configurar la tasa de comisión del vendedor.
        *   Tarjeta para mostrar las ventas brutas totales del día actual.
        *   Tarjeta para mostrar la ganancia (comisión) total del día actual.
    *   **Análisis Diario:** Se añadió un componente `Accordion` que agrupa las ventas por día. Cada sección del acordeón es un día y muestra la venta total y la ganancia de esa jornada.
    *   **Desglose por Sorteo:** Dentro de cada acordeón diario, una `Table` detalla las ventas y comisiones específicas para cada tipo de sorteo (ej. Lotería Nacional, Palé).

2.  **Generación de Reportes PDF con `jspdf`:**
    *   **Función `generateSalesReport`:** Se creó una lógica para generar un reporte PDF dinámico y profesional.
    *   **Personalización:** El reporte incluye el logo y el nombre del negocio (obtenidos del `BusinessContext`) y la fecha de generación.
    *   **Tablas Automáticas:** Se utiliza `jspdf-autotable` para crear tablas claras y bien formateadas que presentan los datos financieros, replicando la estructura del acordeón.
    *   **Paginación:** Se añadió un contador de páginas (`Página X de Y`) al pie de cada página del PDF.

3.  **Funcionalidad de Compartir y Descargar:**
    *   **Descargar PDF:** Un botón permite al usuario descargar el reporte directamente a su dispositivo.
    *   **Compartir PDF:** Un segundo botón utiliza la API `navigator.share` para permitir compartir el archivo PDF a través de aplicaciones nativas (WhatsApp, correo, etc.) en dispositivos compatibles. Se implementó un fallback para descargar el archivo si la API de compartir no está disponible o falla.

4.  **Gestión de Datos (Server Action):**
    *   **Zona de Peligro:** Se añadió una sección para acciones destructivas, como restablecer el historial de ventas.
    *   **Borrado Seguro:** Se implementó un `Dialog` de confirmación que requiere que el usuario escriba la palabra "BORRAR" para activar el botón de eliminación.
    *   **Server Action `deleteAllSalesForUser`:** Se creó una acción de servidor para manejar la lógica de borrado de todas las ventas de un usuario en Firestore de forma segura y eficiente.

5.  **Resolución de Errores y Estabilización:**
    *   Se solucionó un error debido a un comando obsoleto de `shadcn-ui`.
    *   Se corrigió un `TypeError` relacionado con una inconsistencia de nombres (`businessLogo` vs. `logoUrl`) entre el `BusinessContext` y la nueva página de Finanzas. La solución se aplicó de forma local a la página de Finanzas para no afectar otros componentes, siguiendo las directrices del usuario.
    *   El proyecto fue compilado con éxito (`npm run build`), asegurando que no hay errores de sintaxis, tipos o dependencias.

---

### Recuperación Crítica del Sistema

**Objetivo:** Recuperación del sistema tras una serie de modificaciones fallidas.

**Pasos Realizados:**
*   **Restauración de Reglas de Seguridad:** Se implementaron y desplegaron nuevas reglas de Firestore para permitir el acceso de lectura público a la configuración inicial y requerir autenticación para todas las demás operaciones.
*   **Recreación de Credenciales del Servidor:** Se recreó el archivo `.env.local` y se guio al usuario para rellenarlo con las credenciales correctas del Admin SDK de Firebase.
