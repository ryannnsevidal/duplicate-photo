import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppRouter } from "./components/AppRouter";
import { SecurityProvider } from "./components/SecurityProvider";
import { SecureConfigScript } from "./components/SecureConfigScript";
import { ProductionErrorBoundary } from "./components/ProductionErrorBoundary";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  console.log('App component rendering...');
  
  // Initialize session timeout for 30 minutes (production setting)
  useSessionTimeout(30);
  
  return (
    <ProductionErrorBoundary>
      <SecurityProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SecureConfigScript />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/*" element={<AppRouter />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </SecurityProvider>
    </ProductionErrorBoundary>
  );
};

export default App;
