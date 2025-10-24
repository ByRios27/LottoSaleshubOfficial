# Blueprint: Lotto Sales Hub

## Visión General

Esta aplicación es un centro de ventas de lotería, diseñado para permitir a los usuarios interactuar con datos de lotería en tiempo real. La base de la aplicación está construida con Next.js y aprovecha Firebase para la autenticación, la base de datos en tiempo real y la administración del servidor.

## Diseño y Estilo

*   **Framework:** Next.js con App Router
*   **Estilo:** (Aún por definir, se centrará en un diseño moderno y responsivo)
*   **Componentes:** (Se definirán a medida que se construya la interfaz de usuario)

## Características Implementadas

### **Configuración del Backend y Firebase**

*   **SDK de Firebase (Cliente):** Se ha configurado el SDK de Firebase para el lado del cliente, permitiendo la interacción desde el navegador.
*   **SDK de Firebase Admin (Servidor):**
    *   Se ha instalado y configurado el paquete `firebase-admin`.
    *   Se ha creado un archivo de configuración (`src/lib/firebase-admin.ts`) que utiliza una cuenta de servicio para inicializar el SDK de Admin de forma segura.
    *   La aplicación ahora puede realizar operaciones de backend autenticadas con Firebase, como leer y escribir en la Realtime Database con privilegios de administrador.
*   **Manejo de Credenciales:** Se ha establecido un sistema seguro para manejar las credenciales del servidor, asegurando que las claves privadas no queden expuestas en el código del cliente.

### **Autenticación de Usuarios**

*   **Flujo de Autenticación Completo:** Se ha implementado un sistema de inicio y cierre de sesión robusto utilizando Firebase Authentication.
*   **Inicio de Sesión con Correo/Contraseña:** Los usuarios pueden autenticarse de forma segura utilizando su correo electrónico y contraseña.
*   **Gestión de Estado en Tiempo Real:** La aplicación utiliza el hook `useAuthState` de `react-firebase-hooks` para escuchar los cambios de estado de autenticación en tiempo real. La interfaz de usuario reacciona instantáneamente al iniciar o cerrar sesión.
*   **Notificaciones y Manejo de Errores:** Se muestran notificaciones claras al usuario para confirmar un inicio de sesión exitoso, un cierre de sesión o para informar de errores durante el proceso (por ejemplo, credenciales incorrectas).

### **Página de Resultados y Ganadores**

*   **Cálculo Automático de Ganadores:** El sistema cruza automáticamente los resultados de los sorteos registrados con las ventas de tickets para identificar a los ganadores.
*   **Visualización de Recibos para Ganadores:** Se ha implementado la funcionalidad para que al hacer clic en el ícono de "visualizar" en la lista de ganadores, se muestre el comprobante de venta correspondiente, de forma similar a la sección de "Ventas Realizadas".

## Plan Actual

*   **[COMPLETADO]** Configurar la integración de Firebase, tanto para el cliente como para el servidor.
*   **[COMPLETADO]** Implementar el flujo de autenticación de usuarios con correo y contraseña.
*   **[COMPLETADO]** Activar la visualización de recibos en la sección de ganadores.
*   **[PRÓXIMO]** Diseñar y construir la interfaz de usuario principal para mostrar los datos de la lotería.
*   **[PRÓXIMO]** Implementar la lógica para leer y mostrar datos desde la Firebase Realtime Database.
*   **[PRÓXIMO]** Añadir funcionalidades de interacción para el usuario (por ejemplo, comprar billetes, ver resultados).
