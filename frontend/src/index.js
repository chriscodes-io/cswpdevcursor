import React from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import App from "@/App";

const container = document.getElementById("root");
if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    // eslint-disable-next-line no-console -- critical mount failure must always surface
    console.error("Error rendering app:", error);
    // Safe error rendering without innerHTML
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding: 20px; color: red;';
    const title = document.createElement('h1');
    title.textContent = 'Error';
    const pre = document.createElement('pre');
    pre.textContent = error.message;
    errorDiv.appendChild(title);
    errorDiv.appendChild(pre);
    container.appendChild(errorDiv);
  }
} else {
  // eslint-disable-next-line no-console -- critical: root element missing
  console.error("Root element not found!");
}
