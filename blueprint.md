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

## Plan de Acción Completado (Más Reciente)

### Mejora de la Función 'Reiniciar Día'

**Objetivo:** Asegurar que la función "Reiniciar Día" realice una limpieza completa de todos los datos transaccionales del día.

**Pasos Realizados:**

1.  **Diagnóstico:** Se observó que la acción `resetDailyData` eliminaba las ventas, los resultados y el índice de tickets, pero no borraba los registros de premios pagados (`payouts`) ni los cierres diarios (`dailyClosures`).
2.  **Solución:** Se modificó la Server Action `resetDailyData` en `src/app/(dashboard)/sales/actions.ts`.
3.  **Implementación:** Se añadieron llamadas a la función auxiliar `deleteCollection` para eliminar todos los documentos dentro de las colecciones `users/{userId}/payouts` y `users/{userId}/dailyClosures`.
4.  **Resultado:** El botón "Reiniciar Día" ahora garantiza un borrado completo, dejando la aplicación en un estado limpio para el inicio de una nueva jornada.

### Corrección de Renderizado en Tiempo Real (Edición de Ventas)

**Objetivo:** Solucionar un problema crítico donde la interfaz de usuario no se actualizaba inmediatamente después de editar una venta, requiriendo una recarga manual para ver el cambio.

**Pasos Realizados:**

1.  **Diagnóstico Inicial:** Se confirmó que los datos se guardaban correctamente en Firestore, pero la interfaz de React no se volvía a renderizar con la nueva información.
2.  **Análisis del Problema:** Se identificó una "condición de carrera" en `SalesContext.tsx`. Un intento previo de "actualización optimista" entraba en conflicto con el listener en tiempo real (`onSnapshot`) de Firestore. El listener, a veces leyendo una caché local desactualizada, revertía el cambio visual, causando la inconsistencia.
3.  **Solución Arquitectónica:** Se refactorizó por completo el listener `onSnapshot` para utilizar la función `docChanges()`. Este método proporciona información granular sobre qué documentos específicos fueron `añadidos`, `modificados` o `eliminados`.
4.  **Implementación:** El `SalesContext` ahora actualiza su estado de forma quirúrgica: modifica, añade o elimina solo las ventas afectadas, en lugar de reemplazar toda la lista.
5.  **Resultado:** La condición de carrera ha sido eliminada. La interfaz ahora reacciona de forma instantánea y precisa a cualquier cambio en la base de datos, garantizando una experiencia de usuario fluida y fiable.

---

## Plan de Acción Anterior

### Correcciones de Rendimiento y UI (Ventas)

**Objetivo:** Solucionar la lentitud en la carga/guardado de ventas, un error de flujo en el modal de edición y un problema de diseño en la vista móvil del historial.

**Pasos Realizados:**

1.  **Optimización de Rendimiento en `ventas-del-dia`:**
    *   **Diagnóstico:** Se confirmó que la página `/ventas-del-dia` cargaba todos los documentos de ventas y pagos del día mediante `getDocs`, causando una carga lenta y un alto consumo de recursos.
    *   **Solución:** Se refactorizó el componente para utilizar escuchas en tiempo real (`onSnapshot`). Ahora, los totales de ventas y premios se actualizan de forma instantánea y eficiente, sin necesidad de recargar la página ni de consultar todos los documentos.

2.  **Corrección de Flujo en Modal de Edición:**
    *   **Diagnóstico:** Al hacer clic en "Editar" una venta, el modal no cambiaba automáticamente a la pestaña de edición, forzando al usuario a hacerlo manualmente.
    *   **Solución:** Se modificó la función `handleEditSale` en `SalesModal.tsx` para que, además de cargar los datos de la venta, active programáticamente la pestaña de edición, haciendo el flujo de trabajo más intuitivo y rápido.

3.  **Arreglo de Diseño en Vista Móvil:**
    *   **Diagnóstico:** El historial de ventas dentro del `SalesModal` usaba una cuadrícula (`grid`) que no se adaptaba a pantallas pequeñas, provocando que los elementos se superpusieran.
    *   **Solución:** Se reemplazó la estructura de la lista del historial por un layout basado en `flexbox`, creando un diseño totalmente responsivo que presenta la información de forma clara y ordenada en todos los dispositivos.

### Eliminación de la Sección de Finanzas

**Objetivo:** Resolver un grave problema de rendimiento y simplificar la aplicación eliminando una sección redundante.

**Pasos Realizados:**

1.  **Diagnóstico:** Se identificó que la página `/finanzas` cargaba de forma ineficiente todos los documentos de ventas (`getDocs`) en cada visita, causando una alta latencia a medida que crecía el volumen de datos.
2.  **Decisión Estratégica:** En colaboración con el usuario, se determinó que la página "Ventas del Día" ya cubría las necesidades de análisis financiero, haciendo que la página de "Finanzas" fuera redundante.
3.  **Eliminación de Archivos:** Se borraron los archivos `src/app/(dashboard)/finanzas/page.tsx` y `src/app/(dashboard)/finanzas/actions.ts`.
4.  **Limpieza de Navegación:** Se eliminó el enlace a `/finanzas` del menú principal en `src/app/page.tsx`, eliminando por completo el acceso a la sección.
5.  **Resultado:** El problema de rendimiento ha sido solucionado de raíz, y la base de código es ahora más limpia y fácil de mantener.

