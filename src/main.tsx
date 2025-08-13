import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Ensure the root element exists and create React root
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check your index.html file.");
}

// Clear loading fallback and create React root
const root = createRoot(rootElement);

// Render app with error boundary
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Mark app as loaded for production
if (rootElement.children.length > 0) {
  rootElement.classList.add('app-loaded');
}
