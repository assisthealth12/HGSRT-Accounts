# Hotel GSR - Property Management System

A modern, cloud-based Property Management System (PMS) designed for Hotel GSR. This application handles everything from front-desk operations (room board, check-ins) to back-office accounting (POS, payroll, expenses).

## 🏨 Features
- **Front Desk / Reception:** Live room board, guest check-in/out, folio management.
- **Restaurant POS:** Direct billing to room folios (KOT) or immediate cash/card settlements.
- **HR & Payroll:** Employee management and automated payroll runs.
- **Accounts:** Expense tracking, vendor management, and unified financial reporting.
- **Admin & Settings:** Property management, tax configuration (GST), and Role-Based Access Control (RBAC).

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite 8
- **Styling:** Tailwind CSS v4, shadcn/ui
- **State Management:** Zustand (Auth), TanStack Query (Data Fetching)
- **Backend (BaaS):** Firebase (Auth, Firestore, Cloud Functions, Hosting)
- **CI/CD:** GitHub Actions (Automated deployments to Firebase Hosting)

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v20+)
- Firebase CLI (`npm install -g firebase-tools`)

### Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/assisthealth12/HGSRT-Accounts.git
   cd "Hotel GSR"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   *(If prompted, also install function dependencies: `cd functions && npm install`)*

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:5173`.

## ☁️ Deployment (Firebase)

This project uses **GitHub Actions** for CI/CD. Any push or merged pull request to the `main` branch will automatically trigger a build and deployment to Firebase Hosting.

Manual deployment can be done via:
```bash
npm run build
firebase deploy --only hosting
```
