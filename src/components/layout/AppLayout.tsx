import type { ReactNode } from "react";

interface AppLayoutProps {
  topBar: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  detail: ReactNode;
}

export function AppLayout({ topBar, sidebar, main, detail }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <header className="top-bar">{topBar}</header>
      <aside className="sidebar">{sidebar}</aside>
      <main className="main-panel">{main}</main>
      <section className="detail-panel">{detail}</section>
    </div>
  );
}
