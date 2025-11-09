# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

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
*   **Configuración de Next.js:**
    *   Configurado para permitir imágenes desde `firebasestorage.googleapis.com`.
*   **Diseño y Estilo:**
    *   Interfaz moderna con componentes reutilizables.
    *   Uso de Tailwind CSS para el diseño.
    *   Componentes de `headlessui` y `heroicons`.
*   **CI/CD:** Despliegue automático a través de GitHub.

## Plan y Pasos para el Cambio Actual

1.  **Restaurar y Corregir `business/page.tsx`:**
    *   **Acción:** Reintegrar el código JSX para las secciones de "Temas" y "Zona de Peligro (Restablecer)" que fueron eliminadas por error.
    *   **Verificación:** Asegurarse de que la lógica de subida de logo (ruta `logos/`, guardado inmediato) y la sintaxis del componente `<Image>` (uso de `fill` y `style`) se mantengan correctas.

2.  **Corregir Problema de Subida en `draws/page.tsx`:**
    *   **Análisis:** Investigar el archivo `src/app/(dashboard)/draws/page.tsx` para encontrar la causa del bucle "subiendo". La hipótesis principal es que la ruta de subida a Firebase Storage es incorrecta (no coincide con las reglas de seguridad).
    *   **Acción:** Modificar la función que sube la imagen del sorteo para que utilice la ruta correcta (`logos/` en lugar de cualquier otra).
    *   **Verificación:** Asegurar que el manejo del estado de la subida (por ejemplo, `setUploadStatus`) se reinicie correctamente tanto en caso de éxito como de error, utilizando un bloque `finally`.

3.  **Verificación Final y Despliegue:**
    *   **Acción:** Ejecutar el comando `npm run build` en el entorno de desarrollo para simular el proceso de compilación de producción y detectar cualquier error de sintaxis o de tipo.
    *   **Acción:** Una vez la compilación sea exitosa, hacer `commit` de todos los archivos modificados (`blueprint.md`, `business/page.tsx`, `draws/page.tsx`) a GitHub.
    *   **Resultado Esperado:** El `push` a la rama `main` activará el flujo de CI/CD, que esta vez debería completarse sin errores de compilación, desplegando la versión completamente funcional de la aplicación.
