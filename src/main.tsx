import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { initTheme } from "./lib/theme";

// Apply saved theme before first paint to avoid flash
initTheme();

const params = new URLSearchParams(window.location.search);
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

if (params.get("mode") === "record") {
  const tableId = params.get("table") ?? "";
  const recordId = params.get("record") ?? "";
  import("./components/record/RecordDetailWindow").then(({ RecordDetailWindow }) => {
    root.render(
      <React.StrictMode>
        <RecordDetailWindow tableId={tableId} recordId={recordId} />
      </React.StrictMode>
    );
  });
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
