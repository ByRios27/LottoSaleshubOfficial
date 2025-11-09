# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

## Características Implementadas

### Estructura de Proyecto
*   **Next.js App Router:** Utiliza la estructura de enrutamiento basada en archivos en el directorio `/app`.
*   **Componentes de Servidor (RSC):** Predominantemente usa React Server Components para un rendimiento óptimo.
*   **Client Components:** Uso selectivo de `"use client"` para componentes interactivos y estados específicos del navegador.
*   **Gestión de Rutas:**
    *   `/app/(dashboard)/`: Rutas protegidas para el panel de control.
    *   `/app/login`: Página de inicio de sesión.
    *   `/app/verificacion`: Ruta para la verificación de tickets con subrutas dinámicas (`/[ticketId]`).
*   **Directorios Comunes:**
    *   `/components`: Componentes UI reutilizables.
    *   `/contexts`: Contextos de React para la gestión de estados globales (Autenticación, Negocios, Sorteos, Resultados, Ventas).
    *   `/hooks`: Hooks personalizados (ej. `usePersistentSales`).
    *   `/lib`: Funciones de utilidad y configuración de Firebase.

### Autenticación y Autorización
*   **AuthContext:** Contexto para la gestión del estado de autenticación del usuario.
*   **Firebase Admin SDK:** Utilizado en el backend (ej. `src/lib/firebase/admin.ts`) para operaciones de administrador y seguridad.

### Gestión de Datos
*   **Firebase:** Integración con Firebase para la base de datos (Firestore), autenticación y otras funcionalidades.
*   **Server Actions:** Utilizado para mutaciones de datos seguras desde el lado del cliente al servidor (ej. `src/app/verificacion/actions.ts`, `src/app/(dashboard)/sales/actions.ts`).
*   **Contextos:**
    *   `BusinessContext`: Para la gestión de datos relacionados con negocios.
    *   `DrawsContext`: Para la gestión de datos de sorteos.
    *   `ResultsContext`: Para la gestión de resultados de sorteos.
    *   `SalesContext`: Para la gestión de datos de ventas.

### Interfaz de Usuario (UI) y Diseño
*   **Componentes UI:** Utiliza componentes UI modernos y estilizados (ej. `src/components/ui/alert-dialog.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, `table.tsx`).
*   **Tematización:** Integración de temas (ej. `src/lib/themes.ts`, `public/theme-*.png`).
*   **Diseño Responsivo:** Adaptabilidad a diferentes tamaños de pantalla (web y móvil).
*   **Elementos Visuales:** Incorporación de iconos (`public/*.svg`), imágenes de fondo (`public/background-main.jpg.png`) y componentes interactivos como `AppLogo.tsx` y `ThemeManager.tsx`.
*   **Accesibilidad (A11Y):** Consideración de estándares de accesibilidad en el diseño.

### Funcionalidades Específicas
*   **Módulo de Verificación de Tickets:**
    *   Ruta `/app/verificacion` para la entrada y verificación de tickets.
    *   Ruta dinámica `/app/verificacion/[ticketId]` para la visualización de detalles de un ticket específico.
    *   Server Actions (`actions.ts`) para procesar la verificación.
*   **Panel de Control (Dashboard):**
    *   Rutas dedicadas para `business`, `draws`, `sales` y `sellers`.
    *   Componentes específicos de ventas (ej. `Receipt.tsx`, `SalesModal.tsx`).

### Herramientas y Configuración
*   **ESLint:** Configuración (`eslint.config.mjs`) para asegurar la calidad del código.
*   **Tailwind CSS:** Configuración (`tailwind.config.js`, `tailwind.config.ts`, `postcss.config.js`) para un desarrollo rápido de la interfaz de usuario.
*   **package.json/package-lock.json:** Gestión de dependencias.
*   **.idx/dev.nix:** Configuración del entorno de desarrollo.

## Plan y Pasos para el Cambio Actual

Actualmente no hay un cambio solicitado específico, pero este blueprint servirá como base para cualquier solicitud futura.