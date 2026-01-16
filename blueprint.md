# Blueprint: Lotto Sales Hub

## Descripción General

Lotto Sales Hub es una aplicación web progresiva (PWA) diseñada para la gestión y el análisis de ventas de lotería. La aplicación permite a los usuarios realizar un seguimiento de las ventas, los resultados de los sorteos, y el rendimiento del negocio. Está construida con Next.js y aprovecha Firebase para la autenticación, la base de datos (Firestore) y el hosting.

## Arquitectura de Datos: Firestore como Única Fuente de Verdad

Para garantizar el máximo rendimiento, escalabilidad y fiabilidad, toda la información de la aplicación (ventas, sorteos, resultados, etc.) se gestiona exclusivamente a través de Firestore. No se utiliza el `localStorage` del navegador para la persistencia de datos críticos. La comunicación con la base de datos se realiza principalmente a través de escuchas en tiempo real (`onSnapshot`) para asegurar una interfaz de usuario siempre sincronizada y una experiencia fluida.

## Diseño y Estilo

La aplicación sigue un enfoque de diseño moderno y audaz, con un fuerte énfasis en la experiencia del usuario.

*   **Tipografía:** Se utilizan fuentes expresivas con un fuerte énfasis en la jerarquía visual.
*   **Color:** La paleta de colores es rica y variada, con una amplia gama de tonos verdes y dorados.
*   **Textura y Profundidad:** Se aplica una sutil textura de ruido al fondo y se utilizan sombras suaves y multicapa en los elementos de la interfaz.
*   **Iconografía:** Se utiliza la librería `heroicons` para proporcionar iconos claros y modernos.
*   **Interactividad:** Los elementos interactivos tienen efectos de "hover" para proporcionar una retroalimentación visual clara.
*   **Responsividad:** La aplicación está diseñada para ser totalmente responsiva.

---

## Plan de Acción (Sesión Actual)

### Restauración Completa del Proyecto

*   **Objetivo:** Solucionar una serie de errores críticos que surgieron tras modificaciones previas que rompieron la integridad del proyecto.
*   **Acción:** Se ejecutó un `git reset --hard` para revertir forzosamente todo el código del proyecto al `commit 5ac663f...`, un estado estable y funcional conocido.
*   **Resultado:** Se eliminaron con éxito todos los errores de compilación y de conexión. La aplicación fue restaurada a su plena funcionalidad y el repositorio en GitHub se sincronizó forzosamente para reflejar este estado estable.

### Mejora de UI: Cambio de Título en la Página de Estadísticas

*   **Objetivo:** Reemplazar el título "Supercomputadora de Contabilidad" en la página de ventas diarias por uno más claro, profesional y conciso.
*   **Acción:** Se modificó el archivo `src/app/(dashboard)/ventas-del-dia/page.tsx` para cambiar el `<h1>` a "Estadísticas".
*   **Resultado:** El título de la página ahora es más intuitivo y descriptivo para el usuario. El cambio se guardó en un nuevo commit.

---

## Plan de Acción Anterior

### Correcciones de Rendimiento y UI (Ventas)

*   **Objetivo:** Solucionar la lentitud en la carga/guardado de ventas, un error de flujo en el modal de edición y un problema de diseño en la vista móvil del historial.
*   **Pasos Realizados:**
    1.  **Optimización de Rendimiento en `ventas-del-dia`:** Se refactorizó el componente para utilizar escuchas en tiempo real (`onSnapshot`) en lugar de `getDocs`, mejorando drásticamente la velocidad y eficiencia.
    2.  **Corrección de Flujo en Modal de Edición:** Se modificó la función `handleEditSale` para que active automáticamente la pestaña de edición.
    3.  **Arreglo de Diseño en Vista Móvil:** Se reemplazó la `grid` del historial por un layout basado en `flexbox` para asegurar la responsividad.

### Eliminación de la Sección de Finanzas

*   **Objetivo:** Resolver un grave problema de rendimiento y simplificar la aplicación eliminando una sección redundante.
*   **Pasos Realizados:** Se eliminaron los archivos de la ruta `/finanzas` y el enlace correspondiente en la navegación principal.

### Auditoría y Refactorización de la Persistencia de Datos

*   **Objetivo:** Asegurar que todos los datos de la aplicación se gestionen de forma centralizada y eficiente en Firestore.
*   **Pasos Realizados:** Se auditaron y refactorizaron los contextos de React para usar `onSnapshot` en lugar de `getDocs`, eliminando cualquier dependencia de `localStorage`.
