# 🌍 Urban Clean (Coffee-n-Code)

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**Urban Clean** is a modern, smart waste management and urban cleaning system designed to bridge the gap between citizens and administrators. This platform provides an intuitive interface for reporting issues, tracking complaints, and managing urban resources in real-time.

---

## 🚀 Key Features

### 👤 Citizen Interface
- **Easy Reporting**: Report waste issues, illegal dumping, or broken infrastructure with photo uploads and location tagging.
- **Track Complaint**: Real-time status tracking of submitted reports (Pending, In Progress, Resolved).
- **Interactive Dashboard**: View community cleaning activities and a summary of personal contributions.
- **Activity Feed**: Stay updated with the latest community-driven environmental tasks.

### 🛡️ Admin Dashboard
- **Request Management**: Streamlined queue for viewing, assigning, and resolving citizen reports.
- **Real-time Analytics**: Visual data representations of city-wide waste hotspots and resolution efficiency.
- **Secure Authentication**: Dedicated admin login portal to protect system integrity.
- **Staff Assignment**: (Conceptual) Interface for directing resources to critical areas.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (for smooth animations)
- **Backend/DB**: [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Maps**: [Leaflet](https://leafletjs.com/) (with [React-Leaflet](https://react-leaflet.js.org/))

---

## 🏗️ Project Structure

```text
src/
├── components/       # Reusable UI elements (Hero, Navbar, Footer)
├── context/          # State management (Theming, Auth)
├── firebase/         # Configuration and service layer
├── layouts/          # Citizen and Admin page shells
├── pages/
│   ├── admin/        # Admin-only dashboards and login
│   └── citizen/      # Citizen-facing reporting and tracking
└── main.jsx          # Entry point
```

---

## ⚙️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KesarPP/Urban_Clean_CoffeenCode.git
   cd Urban_Clean_CoffeenCode
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Firebase:**
   Create a `.env` file in the root directory and add your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository and submit pull requests to help make our cities cleaner.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Made with ❤️ by the Team Coffee and Code*
