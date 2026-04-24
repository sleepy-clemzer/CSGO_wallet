/**
 * Application entry point.
 *
 * Initializes i18n before mounting the React tree to ensure
 * translations are available on first render.
 */
import "./i18n/index.js";
import React    from "react";
import ReactDOM from "react-dom/client";
import App      from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);