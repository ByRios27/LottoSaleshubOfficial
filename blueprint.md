
# Blueprint: LottoSalesHub

## Descripción General

LottoSalesHub es una aplicación de punto de venta y gestión de loterías diseñada para funcionar como una "supercomputadora de contabilidad". Su objetivo es proporcionar una visión clara y en tiempo real de cada aspecto financiero del negocio, desde las ventas diarias hasta la gestión de fondos de terceros, utilizando **Firestore como única fuente de verdad**.

## Diseño y Estilo

La aplicación sigue una estética moderna y audaz, con un tema oscuro predominante y acentos de color verde vibrante para crear un aspecto energético y premium.

*   **Tipografía:** Se utilizan fuentes expresivas con un fuerte énfasis en la jerarquía visual.
*   **Color:** La paleta de colores es rica y variada, con una amplia gama de tonos verdes y dorados.
*   **Textura y Profundidad:** Se aplica una sutil textura de ruido al fondo y se utilizan sombras suaves y multicapa en los elementos de la interfaz.
*   **Iconografía:** Se utiliza la librería `heroicons` para proporcionar iconos claros y modernos.
*   **Interactividad:** Los elementos interactivos tienen efectos de "hover" para proporcionar una retroalimentación visual clara.
*   **Responsividad:** La aplicación está diseñada para ser totalmente responsiva.

## Plan de Acción Actual

**Objetivo:** Construir la "Supercomputadora de Contabilidad" v2, integrada con Firestore.

Esta página se convertirá en el centro de control financiero, permitiendo al usuario:

*   Visualizar las **ventas totales** y las **ganancias** del día **(obtenidas automáticamente de Firestore)**.
*   Registrar y totalizar los **premios pagados**.
*   Calcular la **ganancia o pérdida** neta en tiempo real.
*   Registrar los **fondos iniciales** y el estado de la caja (banca y efectivo).
*   Gestionar el dinero inyectado por "la casa grande" (fondos de terceros).
*   **Guardar un historial de cierres diarios en Firestore** para futuras consultas.

**Fases de Desarrollo:**

1.  **Fase 1: Obtención Automática de Ventas (En progreso):**
    *   Modificar la página para que consulte la colección `sales` del usuario en Firestore.
    *   Filtrar las ventas que corresponden al día actual.
    *   Sumar el `totalCost` de esas ventas para obtener las "Ventas Totales Brutas" de forma automática.

2.  **Fase 2: Integración con Firestore para Datos Contables:**
    *   Crear una nueva colección en Firestore (ej: `dailyClosures`) para almacenar los datos manuales (fondo inicial, saldos, fondos de terceros, premios manuales).
    *   Al cargar la página, obtener los datos del día actual desde esta nueva colección.
    *   Implementar la función `Guardar Cierre del Día` para escribir o actualizar el documento del día en Firestore.

3.  **Fase 3: Acciones y Reportes:**
    *   Implementar el botón "Reiniciar Día", que borrará el documento del día en `dailyClosures`.
    *   Crear la función "Generar Reporte PDF" que utilizará los datos de Firestore para crear un informe completo.
