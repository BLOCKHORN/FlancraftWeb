// src/main.jsx
import "./config/lucidePatch"; // 👈 parches de lucide primero
import "./utils/devBackendProxy"; // 👈 proxy SOLO en dev para redirigir Render → localhost

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import "./styles/base/main.scss";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
