import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppWithSessionModal } from "@/components/AppWithSessionModal";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

const queryClient = new QueryClient();

// --- E2E test mode switch ---
const E2E = import.meta.env.VITE_E2E_TEST_MODE === '1' || import.meta.env.VITE_E2E_TEST_MODE === 'true';

async function bootstrap() {
  if (E2E) {
    const E2EApp = (await import('./e2e/E2EApp')).default;
    createRoot(document.getElementById("root")!).render(<E2EApp />);
  } else {
    createRoot(document.getElementById("root")!).render(
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
