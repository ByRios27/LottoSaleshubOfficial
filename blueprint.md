# Blueprint: LottoSalesHub

## Overview

This document outlines the architecture, design, and features of the LottoSalesHub application. It serves as a single source of truth to ensure consistency and guide future development.

## Project Architecture

The project follows a hybrid Next.js setup, leveraging both the `pages` and `app` routers for specific functionalities.

*   **Authentication (`pages` router):**
    *   The login functionality is handled by `pages/login.tsx`. This component is responsible for user authentication via Firebase.
    *   Upon successful login, the user is redirected to the root path (`/`).

*   **Main Application (`app` router):**
    *   The core application is built using the App Router within the `src/app` directory.
    *   A route group `src/app/(dashboard)` contains all the protected routes and the main UI for the application after a user logs in.

## Design & Features

*   **Styling:** The application uses Tailwind CSS for a modern, utility-first design approach.
*   **UI:** The user interface is designed to be clean, intuitive, and responsive, with a dark theme (`bg-gray-900`). Interactive elements feature hover effects and transitions for a better user experience.
*   **Iconography:** The app utilizes `@heroicons/react` for clear and consistent iconography. A custom SVG logo is used for branding.
*   **Authentication Flow:**
    1.  User visits the root URL.
    2.  The `src/app/(dashboard)/layout.tsx` checks the user's authentication status.
    3.  If not logged in, the user is redirected to `pages/login.tsx`.
    4.  User submits credentials on the login page.
    5.  `signInWithEmailAndPassword` from Firebase authenticates the user.
    6.  On success, `router.push("/")` sends the user back to the root.
    7.  The layout now detects the authenticated user and renders the requested dashboard page (e.g., `src/app/(dashboard)/page.tsx`).

## Current Development Plan: Main Dashboard

1.  **Create `(dashboard)` Route Group:**
    *   Create a new directory: `src/app/(dashboard)`. This allows sharing a layout across all dashboard pages without affecting the URL.

2.  **Create Dashboard Layout (`layout.tsx`):**
    *   Create `src/app/(dashboard)/layout.tsx` to act as the shell for the dashboard UI.
    *   **Route Protection:** This layout will contain the authentication check, protecting all child routes.
    *   **Shared UI:** It will define the shared UI elements like a top navigation bar (Navbar) and a sidebar menu (Sidebar).

3.  **Create Main Dashboard Page (`page.tsx`):**
    *   Create `src/app/(dashboard)/page.tsx`. This will be the main content page displayed at the root URL (`/`) after login.
    *   It will feature a welcome message, quick stats, and placeholders for future content like lottery draws.

4.  **Refactor Root Page:**
    *   The original `src/app/page.tsx` will be cleaned up to simply render the content from the new `(dashboard)` group, keeping the project structure organized.
