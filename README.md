# 🟦 Slate

> **Calm leadership for your complex data.**
> 
> *A local-first, extremely fast desktop workspace for structured personal data. Created by [Anthony McCloskey](https://anthonymccloskey.com).*

---

**Slate** bridges the gap between simple note-taking apps and heavy, cloud-first spreadsheet databases. Think of it as a stack of relational spreadsheets powered by a real SQLite engine underneath, but wrapped in a stunning, minimal desktop interface.

It is intentionally:
- 🔒 **Single-user & Offline:** Your data stays on your machine.
- ⚡ **Extremely Fast:** Spreadsheet-like editing speed with native performance.
- 🗂️ **Metadata-driven:** Highly structured without becoming bloated.
- 🚫 **Zero Overhead:** No auth, no cloud sync, no subscriptions.

Slate is built for personal knowledge and data workflows: managing contacts, structuring research, tracking complex projects, and logging ideas.

---

## ✨ Features

- **Dark-Themed Workspace:** A beautiful, minimal 3-panel UI with a focus on typography and ease of use.
- **Relational Integrity:** Create, rename, and manage tables and columns securely powered by a local SQLite database.
- **Rich Data Types:** Support for `text`, `long_text`, `date`, `checkbox`, and more.
- **Grid & Record Views:** Fast editable grid cells alongside a dedicated record detail panel.
- **Instant Search:** Lightning-fast local search within any active table.
- **Generalized Cross-Table Links:** A powerful architecture for creating relational links between any records across different tables.

## 🛠️ Stack

Slate combines modern web technology with native performance:
- **Desktop Shell:** [Tauri 2](https://v2.tauri.app/)
- **Frontend:** [React](https://react.dev/) + TypeScript + [Vite](https://vitejs.dev/) + [Zustand](https://zustand-demo.pmnd.rs/) for state management.
- **Icons:** [Lucide](https://lucide.dev/)
- **Database:** SQLite (via `rusqlite`, bundled locally)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- Rust toolchain (`rustup`, `cargo`, `rustc`)

*(If Rust was just installed, be sure to open a new shell or run `source $HOME/.cargo/env`)*

### Install

```bash
# Clone the repository and install dependencies
git clone https://github.com/tadpole256/slate.git
cd slate
npm install
```

### Run (Development)

Launch the native desktop application with hot-reloading:

```bash
npm run tauri -- dev
```

### Build (Production)

Compile the application into a standalone macOS `.app` (or your respective OS executable):

```bash
npm run tauri build
```
*The output bundle will be placed in `src-tauri/target/release/bundle/`.*

---

## 🤝 Contributing & Feedback

**Feedback and contributions are highly welcome!**

Whether you've found a bug, have an idea for a cool new feature, or want to directly contribute code, we'd love your help in making Slate the best local-first workspace out there.

- 🐛 **Found a bug?** Open an [Issue](https://github.com/tadpole256/slate/issues).
- 💡 **Have a feature request?** Start a discussion or open an issue.
- 💻 **Want to contribute code?** 
  1. Fork the repository.
  2. Create a feature branch (`git checkout -b feature/my-new-feature`).
  3. Commit your changes.
  4. Ensure backend tests pass (`cargo test --manifest-path src-tauri/Cargo.toml`).
  5. Open a Pull Request!

If you are just exploring the code, standard React architecture applies in `src/`, and all Tauri/SQLite interactions live safely in `src-tauri/`.

## 📜 License

Slate is free and open-source software, released under the **[GNU General Public License v3.0](./LICENSE)**. 

---
*Built with ❤️ for a calmer, more organized digital life.*
