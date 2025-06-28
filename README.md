# 🧪 Data Alchemist - CSV Rule Builder & Validator

This project is part of the **Software Engineering Intern Assignment** for Digitalyz.
It allows users to ingest data files (`.csv` / `.xlsx`), validate them based on custom rules, edit data inline, and export clean datasets.

## 🚀 Features

### ✅ Milestone 1

* 📁 Upload `.csv` and `.xlsx` files
* 🧾 Dynamic column detection & mapping
* ✅ Validation: ClientID uniqueness, Priority Level (1-5), JSON parsing
* ✏️ Inline editing with real-time validation
* 🔁 Undo / Redo editing support
* 🔍 Global + column-wise filters

### ✅ Milestone 2

* 🧱 Custom Rule Builder UI (condition + message)
* 🎚️ Priority level sliders
* 🧠 Rule-based validation with instant feedback
* 💾 Export options: Clean CSV, JSON, ZIP (multi-format)

### 🚧 Milestone 3 (Stretch Goals)

* Not implemented yet: AI Rules, Natural Language to Rules, AI Validator (will add later)

## 📸 Screenshots

> [Upload](./public/screenshots/upload.png)

## 🛠 Tech Stack

* React + TypeScript
* Tailwind CSS
* PapaParse (.csv handling)
* SheetJS/XLSX (.xlsx support)
* React Data Table Component
* JSZip (ZIP export)

## 📦 Installation & Running Locally

```bash
npm install
npm run dev
```

Navigate to `http://localhost:3000`

## 🌐 Deployment

Live demo hosted on Vercel:
[https://data-alchemist.vercel.app](https://data-alchemist.vercel.app)

## 📁 Folder Structure

```
/components
  ├── FileUpload.tsx     # Main component with full UI
  └── RuleBuilder.tsx     # Reusable rule input panel
/pages
  └── index.tsx          # Entry point
/public                  # Static assets
```

## 📤 Submission Info

* **GitHub Repo:** [https://github.com/jaygautam-dev/data-alchemist-assignment](https://github.com/jaygautam-dev/data-alchemist-assignment)
* **Live Preview:** [https://data-alchemist.vercel.app](https://data-alchemist.vercel.app)
* **Optional Loom Demo:** *(link here if recorded)*

---

## 💼 About Me

👋 I'm Jay Gautam, 3rd-year CSE student passionate about full-stack development, clean UI/UX, and impactful tech. Let's build things that matter!

📫 [jaych7983@gmail.com](mailto:jaych7983@gmail.com) | [LinkedIn](https://linkedin.com/in/jaygautam) | [GitHub](https://github.com/jaygautam-dev)

---

*This project is submitted for the Digitalyz Software Engineering Internship Assignment.*
