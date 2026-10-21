import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import "maplibre-gl/dist/maplibre-gl.css";
import App from "./App";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
import "./index.css"; // ✅ REQUIRED
import { AdminAuthProvider } from "@/auth/AdminAuthProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <App />
        </ThemeProvider>
      </AdminAuthProvider>
      </QueryClientProvider>
    </HashRouter>
  </React.StrictMode>
);
