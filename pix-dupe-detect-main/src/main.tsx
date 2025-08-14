import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// --- E2E test mode switch ---
const E2E = import.meta.env.VITE_E2E_TEST_MODE === '1' || import.meta.env.VITE_E2E_TEST_MODE === 'true';

async function bootstrap() {
  // Ensure root is visible in all environments (avoid any FOUC/visibility toggles)
  const rootEl = document.getElementById("root");
  if (rootEl) (rootEl as HTMLElement).style.visibility = 'visible';
  document.body.style.visibility = 'visible';

  if (E2E) {
    const E2EApp = (await import('./e2e/E2EApp')).default;
    createRoot(rootEl!).render(<E2EApp />);
  } else {
    const [{ QueryClient, QueryClientProvider }, { BrowserRouter }, { AppWithSessionModal }, { Toaster }] = await Promise.all([
      import("@tanstack/react-query"),
      import("react-router-dom"),
      import("@/components/AppWithSessionModal"),
      import("@/components/ui/toaster"),
    ]);

    const queryClient = new QueryClient();

    createRoot(rootEl!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppWithSessionModal />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
  }
}

bootstrap();
