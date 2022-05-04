import { enableMapSet } from "immer";
import { StrictMode } from "react";
import ReactDOMClient from "react-dom/client";
import { App } from "./app";

enableMapSet();

const root = ReactDOMClient.createRoot(
  document.getElementById('app') as HTMLElement
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
