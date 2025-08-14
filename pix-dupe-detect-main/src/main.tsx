import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

async function bootstrap() {
  const rootEl = document.getElementById("root");
  if (rootEl) (rootEl as HTMLElement).style.visibility = 'visible';
  document.body.style.visibility = 'visible';

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

bootstrap();
