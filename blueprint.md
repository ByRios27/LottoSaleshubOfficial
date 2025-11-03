# Blueprint: LottoSalesHub

## Overview

This document outlines the architecture, design, and features of the LottoSalesHub application. It serves as a single source of truth to ensure consistency and guide future development.

## Project Architecture

The project follows a hybrid Next.js setup, leveraging both the `pages` and `app` routers for specific functionalities.

*   **Authentication (`pages` router):**
    *   The login functionality is handled by `pages/login.tsx`. This component is responsible for user authentication via Firebase.
    *   Upon successful login, the user is redirected to the root path (`/`).

*   **Main Application (`app` router):**
    *   The core application, including the main dashboard and subsequent views, is built using the App Router within the `src/app` directory.
    *   The root page (`src/app/page.tsx`) acts as a protected route. It checks for an authenticated user. If the user is not logged in, it automatically redirects them to the `/login` page. If the user is authenticated, it displays the main application dashboard.
    *   All dashboard-related routes (e.g., `/sales`, `/draws`, `/business`) are organized as subdirectories within `src/app/(dashboard)`.

## Design & Features

*   **Styling:** The application uses Tailwind CSS for a modern, utility-first design approach.
*   **UI:** The user interface is designed to be clean, intuitive, and responsive, with a dark theme (`bg-gray-900`). Interactive elements feature hover effects and transitions for a better user experience.
*   **Iconography:** The app utilizes `@heroicons/react` for clear and consistent iconography. A custom SVG logo is used for branding.
*   **Authentication Flow:**
    1.  User visits the root URL.
    2.  `src/app/page.tsx` checks auth status.
    3.  If not logged in, user is redirected to `pages/login.tsx`.
    4.  User submits credentials on the login page.
    5.  `signInWithEmailAndPassword` from Firebase authenticates the user.
    6.  On success, `router.push("/")` sends the user back to the root.
    7.  `src/app/page.tsx` now detects the authenticated user and renders the `DashboardView`.
