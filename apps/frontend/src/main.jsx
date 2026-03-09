import "./config/lucidePatch";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import { AuthModalProvider } from "./context/AuthModalContext";
import "./styles/base/main.scss";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <AuthModalProvider>
          <App />
        </AuthModalProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
