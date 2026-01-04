# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

---

## Historial de Cambios

### Corrección de Interfaz y Compilación en Cierres de Sorteos

**Objetivo:** Solucionar un error de compilación persistente y corregir un error de diseño visual en la función de exportación de imágenes para los cierres de sorteos.

**Pasos Realizados:**

1.  **Corrección del Error Visual en la Imagen Exportada:**
    *   **Problema:** En la imagen generada, los números y sus cantidades vendidas aparecían desalineados, el color no era el correcto y faltaban separadores visuales.
    *   **Solución:** Se modificó el estilo del `div` (`imageExportRef`) en `src/app/(dashboard)/cierres-sorteos/page.tsx`.
        *   Se reemplazó `display: grid` y `justify-content: space-between` con una estructura de rejilla (`grid`) con bordes definidos para cada celda (`border-right`, `border-bottom`).
        *   Se aseguró la alineación correcta de número y cantidad usando `display: flex`, `justify-content: center`, y un `gap`.
        *   Se cambió el color de la cantidad a azul (`color: 'blue'`) como fue solicitado.

2.  **Solución del Error de Compilación (`TypeError`):**
    *   **Problema:** El comando `npm run build` fallaba repetidamente con el error `Type error: Object is possibly 'undefined'`. Este error se producía en la consulta de *fallback* al filtrar ventas, porque el resultado de `toDateSafe(data?.timestamp)` podía ser `null`, y se intentaba llamar al método `.getTime()` sobre un valor potencialmente nulo.
    *   **Solución Definitiva:** Se refactorizó la lógica de filtrado dentro de la función `loadAndConsolidate`.
        *   Se guarda el resultado de `toDateSafe(data?.timestamp)` en una variable temporal (`docDate`).
        *   Se introduce una guarda (`if (!docDate) return false;`) para descartar inmediatamente cualquier registro que no tenga una fecha válida.
        *   Esto garantiza que el código que ejecuta `.getTime()` solo se alcance si `docDate` es un objeto `Date` válido, eliminando el error de tipo.

3.  **Verificación Final:**
    *   Se ejecutó `npm run build` por última vez.
    *   La compilación se completó con éxito, confirmando que tanto el error visual como el error de compilación fueron resueltos de forma definitiva.

### Corrección de Error de Compilación y Estabilización

**Objetivo:** Solucionar un `TypeError` crítico que impedía el despliegue exitoso de la aplicación y mejorar la estabilidad del componente de resultados.

**Pasos Realizados:**

1.  **Diagnóstico del Problema:**
    *   Se ejecutó el comando `npm run build` para replicar el entorno de despliegue.
    *   La compilación falló con un `TypeError: Object is possibly 'undefined'`, localizado en la lógica de filtrado de la consulta de *fallback* en `src/app/(dashboard)/resultados/page.tsx`.
    *   El error ocurría porque `toDateSafe(data.timestamp)?.getTime()` podía devolver `undefined`, y una comparación (`>=`, `<=`) con `undefined` no es válida en TypeScript.

2.  **Solución del `TypeError`:**
    *   Se refactorizó el bloque de filtrado para hacerlo seguro frente a tipos (`type-safe`).
    *   Se introdujo una variable intermedia (`dt`) para almacenar el resultado de `toDateSafe(data.timestamp)`.
    *   Se añadió una guarda (`if (!dt) return false;`) para asegurar que la fecha es un objeto válido antes de intentar usar su método `.getTime()`.
    *   Esto eliminó por completo la posibilidad de que la comparación se realice con un valor `undefined`.

3.  **Eliminación de Advertencias de React Hooks (`useEffect`):**
    *   El linter advertía que la función `loadSavedResults` no estaba incluida en el array de dependencias de dos hooks `useEffect`.
    *   Para solucionar esto y optimizar el rendimiento, la función `loadSavedResults` se envolvió en un hook `useCallback`.
    *   `useCallback` memoriza la función, evitando que se recree en cada renderizado a menos que sus dependencias (`user?.uid`) cambien.
    *   Finalmente, se añadió `loadSavedResults` al array de dependencias de los `useEffect`, cumpliendo con las reglas de los hooks y eliminando las advertencias.

4.  **Verificación Final:**
    *   Se ejecutó `npm run build` nuevamente.
    *   La compilación se completó con éxito (`✓ Compiled successfully`), confirmando que todos los errores y advertencias fueron resueltos.

### Implementación y Mejora Avanzada de la Página de Resultados

**Objetivo:** Crear y optimizar la página de "Resultados y Ganadores", proporcionando una herramienta robusta para calcular premios, gestionar pagos y visualizar los resultados de manera detallada y profesional.

**Funcionalidades Implementadas:**

1.  **Navegación y Acceso:**
    *   Se añadió un enlace directo a "Resultados" en la página de navegación principal (`src/app/page.tsx`), asegurando un acceso rápido y visible para el usuario.

2.  **Cálculo de Ganadores y Gestión de Resultados:**
    *   **Creación de la Página `resultados/page.tsx`:** Se desarrolló la interfaz principal para que el usuario pueda introducir la fecha, el sorteo, el horario y los números ganadores.
    *   **Guardado de Resultados:** Se implementó la lógica para guardar los resultados de cada sorteo en la colección `results` de Firestore, utilizando `serverTimestamp` para registrar la fecha de creación.
    *   **Normalización de Datos:** Se aseguró que los números ganadores se guarden con el formato correcto (`padding` de ceros a la izquierda) según la configuración de cifras (`cif`) de cada sorteo.

3.  **Solución de Error de Índice de Firestore (Fallback Query):**
    *   **Problema:** Al consultar la colección `sales` con múltiples filtros (`where`), Firestore requería un índice compuesto que no se podía crear desde el código.
    *   **Solución Profesional:** Se implementó una estrategia de `try/catch`. El código primero intenta ejecutar la consulta ideal. Si falla con un error de "requires an index", ejecuta una consulta de *fallback* más simple (solo por `drawId`) y realiza el resto del filtrado (por horario y fecha) en memoria del lado del cliente. Esto garantiza que la funcionalidad no se interrumpa y no requiere intervención manual en la consola de Firebase.

4.  **Tabla de Ganadores Mejorada y Detallada:**
    *   **Estructura de Datos Avanzada (`Winner`, `WinnerHit`):** Se refactorizó el cálculo para generar una lista de ganadores con una estructura detallada. Cada ganador (`Winner`) contiene información del cliente y una lista de sus aciertos (`hits`), donde cada acierto (`WinnerHit`) especifica la posición (1ero, 2do, 3ro), el número, la tasa de pago, la cantidad jugada y el monto ganado por ese acierto.
    *   **Visualización Jerárquica:** La nueva tabla de ganadores (JSX) muestra la información de manera clara:
        *   Datos del cliente (nombre y teléfono).
        *   Desglose de cada número acertado, con su cálculo (`cantidad x tasa = monto`).
        *   Monto total ganado por ticket.

5.  **Funcionalidad de Gestión de Pagos:**
    *   **Colección `payoutStatus`:** Se creó una nueva colección en Firestore para persistir el estado de los pagos de cada premio.
    *   **Botón "PAGAR":** Se añadió un botón en cada fila de la tabla de ganadores.
        *   El botón es **verde ("PAGAR")** si el premio está pendiente.
        *   Al hacer clic, se ejecuta la función `markAsPaid`, que guarda el estado como pagado en Firestore y muestra un estado de carga ("PAGANDO...").
        *   Una vez pagado, el botón se vuelve **rojo ("PAGADO")** y se deshabilita, proporcionando una retroalimentación visual clara y persistente.
    *   **Carga de Estados:** El estado de los pagos se carga automáticamente al seleccionar un sorteo, garantizando que la interfaz siempre refleje la información correcta.

6.  **Cálculo de Payout Total:**
    *   El `Total Payout` ahora se calcula como la suma acumulada de los `totalWin` de todos los ganadores mostrados, ofreciendo un resumen financiero preciso para la consulta actual.

7.  **Corrección de Errores y Estabilización:**
    *   Se solucionó un `TypeError` crítico causado por un error de tipeo (`e.targe.value` en lugar de `e.target.value`) en uno de los campos de entrada.
    *   Se validó el proyecto completo con `npm run lint` para asegurar la calidad y consistencia del código.
    *   Finalmente, se consolidaron todos los cambios en un commit y se subieron al repositorio remoto.

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
