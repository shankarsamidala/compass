import { createMemoryRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthScreen } from "./auth-screen";
import { ForgotPasswordScreen } from "./forgot-password-screen";

/**
 * Auth flow (REIN-303). Unified entry: one screen handles sign-in AND account
 * creation (signup-first) + inline email verification; /forgot handles reset.
 */
const router = createMemoryRouter(
  [
    { path: "/auth", element: <AuthScreen /> },
    { path: "/forgot", element: <ForgotPasswordScreen /> },
    { path: "*", element: <Navigate to="/auth" replace /> },
  ],
  { initialEntries: ["/auth"] },
);

export function AuthFlow() {
  return <RouterProvider router={router} />;
}
