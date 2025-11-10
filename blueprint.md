# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

## Punto de Recuperación Estable (Checkpoint)

**Esta versión del proyecto se considera estable y funcional.** Todos los cambios han sido probados, compilados y subidos a la rama `main` de GitHub. Este estado representa un punto de recuperación seguro antes de implementar nuevas funcionalidades.

## Resumen del Último Cambio (Estable)

**Objetivo:** Solucionar un error de persistencia visual en el historial de ventas y mejorar la accesibilidad general de la aplicación sin alterar el diseño.

**Pasos Realizados:**

1.  **Estabilización del Historial de Ventas (`SalesModal`):**
    *   Se diagnosticó que el historial de ventas desaparecía en el entorno de producción debido a un problema de sincronización de estado.
    *   Se implementó un estado local (`sessionSales`) en el modal para almacenar las ventas creadas durante la sesión actual del usuario, asegurando que aparezcan instantáneamente.
    *   El historial mostrado (`completedSales`) ahora es una combinación estable (usando `useMemo`) de las ventas globales del `SalesContext` y las ventas de la sesión local, eliminando el parpadeo y la desaparición de datos.

2.  **Mejoras de Accesibilidad (A11Y):**
    *   **Clase `.sr-only`:** Se añadió una clase de utilidad estándar a `globals.css` para ocultar elementos visualmente mientras se mantienen accesibles para lectores de pantalla.
    *   **Checkboxes Accesibles:** En `SalesModal`, se reemplazó la clase `hidden` por `sr-only` en los checkboxes de selección de horarios, permitiendo que los lectores de pantalla los identifiquen correctamente sin cambiar el diseño.
    *   **Input Accesible:** En la página de `verificacion`, se añadió una etiqueta (`<label>`) al campo de texto del ID del ticket, ocultándola visualmente con la clase `.sr-only` para corregir un fallo de accesibilidad sin impacto visual.

3.  **Verificación de Calidad:** Se ejecutó `npm run lint -- --fix` para asegurar que los cambios no introdujeran errores y mantuvieran la calidad del código.

**Resultado:** La aplicación es ahora más robusta, con un historial de ventas estable y una mejor accesibilidad para todos los usuarios.

## Características Implementadas

*   **Autenticación de Usuarios:** Sistema completo de registro, inicio de sesión y protección de rutas.
*   **Contexto Global:**
    *   `AuthContext`: Gestiona el estado y la información del usuario autenticado.
    *   `BusinessContext`: Gestiona la información del negocio (logo, nombre, tema) a través de la aplicación.
    *   `DrawsContext`: Gestiona el estado de los sorteos.
    *   `SalesContext`: Gestiona el estado de las ventas de forma robusta y optimista.
*   **Gestión de Negocio (Página `/business`):**
    *   Actualización del nombre del negocio.
    *   Subida y actualización del logo del negocio con almacenamiento en Firebase Storage.
    *   Selección y aplicación de temas visuales para la aplicación.
    *   Función para restablecer la información del negocio a sus valores por defecto.
*   **Gestión de Sorteos (Página `/draws`):**
    *   Creación, edición y eliminación de sorteos.
    *   Subida de imágenes para los sorteos con almacenamiento en Firebase Storage.
*   **Gestión de Ventas (Modal de Ventas):**
    *   Formulario de venta con selección de horarios y números.
    *   Cálculo de costo total en tiempo real.
    *   Historial de ventas por sorteo, con funciones para visualizar, compartir y eliminar.
*   **Capacidades de Progressive Web App (PWA):**
    *   Manifiesto de la aplicación y service worker para una experiencia instalable.
*   **Optimización y Accesibilidad:**
    *   Se añadió la propiedad `priority` a la imagen del logo para mejorar la carga visual (LCP).
    *   Se implementaron mejoras de accesibilidad (A11Y) en formularios clave para asegurar la compatibilidad con lectores de pantalla sin alterar el diseño.

## Plan y Pasos para el Cambio Actual

*No hay cambios en curso. La aplicación está en un estado estable y verificado.*
