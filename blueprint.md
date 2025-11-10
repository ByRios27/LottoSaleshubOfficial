# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

## Punto de Recuperación Estable (Checkpoint)

**Esta versión del proyecto se considera estable y funcional.** Todos los cambios han sido probados, compilados y subidos a la rama `main` de GitHub. Este estado representa un punto de recuperación seguro antes de implementar nuevas funcionalidades.

## Resumen del Último Cambio (Estable)

**Objetivo:** Solucionar un error crítico de compilación (`build`) que impedía el despliegue de nuevas versiones y corregir la inconsistencia en el historial de ventas.

**Pasos Realizados:**

1.  **Diagnóstico del Error:** Se identificó que un `commit` anterior (`4e947f9`) introdujo un error de tipo. La función `addSale` en `SalesContext` fue modificada para no devolver ningún valor (`void`), pero el componente `SalesModal` esperaba recibir el objeto de la venta creada, causando el fallo de la compilación de Next.js.
2.  **Corrección de Causa Raíz en `SalesContext`:**
    *   Se modificó la función `addSale` para que llame a la `Server Action` `createSaleWithIndex`.
    *   La función ahora espera el `saleId` devuelto por la acción del servidor.
    *   Se construye un objeto de venta final (`finalSale`) con los datos correctos y el ID devuelto.
    *   `addSale` ahora devuelve una `Promise<Sale>`, proporcionando el objeto de la venta real al componente que la llama.
    *   Se mejoró la actualización del estado local, reemplazando la venta "optimista" temporal por la venta real devuelta por el servidor, asegurando la consistencia de los datos.
3.  **Corrección de Error Secundario:** Se arregló un error de tipo en `SalesContext` donde se intentaba acceder a la propiedad `isLoading` del `AuthContext`, cuando el nombre correcto era `loading`.
4.  **Verificación del Build:** Se ejecutó `npm run build` localmente para confirmar que todos los errores de compilación estaban resueltos y que la aplicación se construía con éxito.
5.  **Resultado:** El error de despliegue ha sido eliminado. La creación de ventas y la actualización del historial ahora son robustas y predecibles, eliminando el parpadeo (`flickering`) y la desaparición de datos.

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
*   **Optimización de Rendimiento:**
    *   Se ha añadido la propiedad `priority` a la imagen del logo del negocio para mejorar el Largest Contentful Paint (LCP) y acelerar la carga visual.

## Plan y Pasos para el Cambio Actual

*No hay cambios en curso. La aplicación está en un estado estable y verificado.*
