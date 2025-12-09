# Proyecto LottoSaleshubOfficial - Blueprint

## Visión General del Proyecto

LottoSaleshubOfficial es una aplicación Next.js diseñada para gestionar la venta de loterías, sorteos y resultados. Incluye funcionalidades para la gestión de negocios, vendedores, ventas y resultados de sorteos, con autenticación de usuarios y una interfaz de usuario moderna y adaptable.

## Plan y Pasos para el Cambio Actual

**Objetivo:** Recuperación Crítica del Sistema.

**Contexto:** Tras una serie de modificaciones fallidas, la aplicación entró en un estado crítico con dos errores principales:
1.  **Error de Permisos de Firestore (`Missing or insufficient permissions`):** Causado por reglas de seguridad incorrectas que bloqueaban el acceso inicial a la configuración pública.
2.  **Error de Credenciales del Servidor (`Faltan FIREBASE_PROJECT_ID...`):** Causado por la eliminación accidental del archivo de entorno `.env.local` que contenía las claves secretas del Admin SDK.

**Pasos de Recuperación Realizados:**

1.  **Restauración de Reglas de Seguridad:**
    *   Se implementaron nuevas `firestore.rules` que permiten el acceso de lectura público (`allow read: if true;`) a una colección específica (`/public/{document=**}`) para la configuración inicial de la app.
    *   Se mantuvo la regla de que cualquier otra operación de lectura o escritura (`/{path=**}/{document}`) requiere que el usuario esté autenticado (`if request.auth != null;`).
    *   Se desplegaron las reglas corregidas usando `firebase deploy --only firestore:rules`.

2.  **Recreación de Credenciales del Servidor:**
    *   Se creó un nuevo archivo `.env.local` en la raíz del proyecto.
    *   Se rellenó el archivo con las credenciales **públicas** del cliente (obtenidas del objeto `firebaseConfig`).
    *   Se instruyó al usuario para que generara una **nueva clave privada** desde la sección "Cuentas de servicio" de la consola de Firebase.
    *   Se guio al usuario para que insertara las credenciales **secretas** (`FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`) en el archivo `.env.local`.

**Resultado Esperado:**

La aplicación debería ser completamente funcional. El error de permisos debe estar resuelto, y el servidor debe tener las credenciales para realizar operaciones autenticadas. El sistema se considera recuperado.

---
*Este blueprint ha sido actualizado para reflejar la recuperación de un estado crítico. A partir de aquí, se reanuda el desarrollo normal.*
