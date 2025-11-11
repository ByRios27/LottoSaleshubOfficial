# Blueprint de la Aplicación: LottoSalesHub

## Propósito y Capacidades

LottoSalesHub es una aplicación web moderna construida con Next.js y desplegada en Firebase App Hosting. Permite a los vendedores registrar y gestionar ventas de tickets de lotería de forma eficiente. La aplicación se conecta a una base de datos Firestore para la persistencia de datos en tiempo real y utiliza Server Actions para una lógica de backend segura y robusta.

---

## Esquema del Proyecto y Características Implementadas

### Estructura y Estilo
- **Framework:** Next.js con App Router.
- **Base de Datos:** Cloud Firestore para almacenar datos de usuarios, ventas, sorteos y negocios.
- **Autenticación:** Firebase Authentication para la gestión de usuarios.
- **Despliegue:** Firebase App Hosting, conectado a un repositorio de GitHub para CI/CD.
- **Estilo:** Componentes de React estilizados para una interfaz limpia y funcional.

### Funcionalidades Clave
1.  **Autenticación de Usuarios:** Sistema completo de registro e inicio de sesión con Firebase.
2.  **Gestión de Ventas en Tiempo Real:**
    - Creación de nuevas ventas a través de un modal interactivo.
    - Las ventas se guardan en la sub-colección `sales` de cada usuario en Firestore.
    - Se utiliza `onSnapshot` de Firestore en el `SalesContext` para escuchar cambios en la base de datos y actualizar la interfaz de usuario en tiempo real, garantizando que los datos mostrados siempre sean un reflejo fiel de la base de datos.
3.  **Server Actions Seguras:** La lógica para crear ventas (`createSaleWithIndex`) se ejecuta en el servidor a través de Server Actions de Next.js, protegiendo la integridad de los datos.
4.  **Variables de Entorno Diferenciadas:**
    - **Públicas (`NEXT_PUBLIC_...`):** Para la configuración del cliente de Firebase que se ejecuta en el navegador.
    - **Privadas (Admin):** Para la configuración del Firebase Admin SDK que se ejecuta en el servidor (Server Actions), permitiendo operaciones con privilegios.

---

## Historial de Cambios Recientes

### Resolución de Error Crítico en Producción (Error 500)

**Diagnóstico:**
Se detectó un error crítico que impedía crear ventas en el entorno de producción. Al intentar crear una venta, la aplicación devolvía un `Error 500 (Internal Server Error)`. La causa raíz fue la ausencia de las credenciales del **Firebase Admin SDK** en la configuración del entorno de producción (`apphosting.yaml`). Esto provocaba que la `Server Action` para crear ventas fallara antes de poder escribir en la base de datos.

**Solución Implementada:**
Se modificó el archivo `apphosting.yaml` para inyectar las variables de entorno de administrador (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) en el entorno de ejecución del backend. Esto permitió al Firebase Admin SDK autenticarse correctamente y ejecutar operaciones en la base de datos con los privilegios necesarios.

**Resultado:**
El error 500 ha sido resuelto. La creación de ventas en producción funciona correctamente. La aplicación está en un estado estable y verificado.

---

## Plan y Pasos para el Cambio Actual

*No hay cambios en curso. La aplicación está en un estado estable y verificado.*
