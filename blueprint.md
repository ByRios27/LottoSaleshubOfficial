
# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

## Punto de Recuperación Estable (Checkpoint)

**Esta versión del proyecto se considera estable y funcional.** Todos los cambios han sido probados, compilados y subidos a la rama `main` de GitHub. Este estado representa un punto de recuperación seguro antes de implementar nuevas funcionalidades.

## Características Implementadas

*   **Autenticación de Usuarios:** Sistema completo de registro, inicio de sesión y protección de rutas.
*   **Contexto Global:**
    *   `AuthContext`: Gestiona el estado y la información del usuario autenticado.
    *   `BusinessContext`: Gestiona la información del negocio (logo, nombre, tema) a través de la aplicación.
    *   `DrawsContext`: Gestiona el estado de los sorteos.
*   **Gestión de Negocio (Página `/business`):**
    *   Actualización del nombre del negocio.
    *   Subida y actualización del logo del negocio con almacenamiento en Firebase Storage.
    *   Selección y aplicación de temas visuales para la aplicación.
    *   Función para restablecer la información del negocio a sus valores por defecto.
*   **Gestión de Sorteos (Página `/draws`):**
    *   Creación, edición y eliminación de sorteos.
    *   Subida de imágenes para los sorteos con almacenamiento en Firebase Storage.
*   **Capacidades de Progressive Web App (PWA):**
    *   Configuración de `manifest.json` para permitir la instalación en dispositivos móviles.
    *   Definición de iconos personalizados para la pantalla de inicio.
*   **Configuración de Next.js:**
    *   Configurado para permitir imágenes desde `firebasestorage.googleapis.com`.
*   **Diseño y Estilo:**
    *   Interfaz moderna con componentes reutilizables.
    *   Uso de Tailwind CSS para el diseño.
    *   Componentes de `headlessui` y `heroicons`.
*   **CI/CD:** Despliegue automático a través de GitHub.

## Plan y Pasos para el Cambio Actual

*No hay cambios en curso. La aplicación está en un estado estable.*
