# SmartRent ET - Frontend & Payment Mini-App

> **Government-Integrated Rental Payment, Compliance, and Monitoring System for Ethiopia**

SmartRent ET connects registered rental agreements with secure digital payments, making monthly rental settlement effortless for tenants while establishing transparent, audit-ready records for landlords and municipal housing authorities.

---

## 🌟 Overview & Capabilities

- **Institutional Public Portal (`/`)**: High-trust marketing website communicating ecosystem value across Tenants, Landlords, Rental Agreements, Digital Payments, and Municipal Housing Offices.
- **Simulated Payment Experience (`/pay`)**: A streamlined 4-step utility payment workflow simulating future **Telebirr** and **Commercial Bank of Ethiopia (CBE)** mini-app integration.
- **Authentic Ethiopian Fintech Identity**: Tailored brand experiences for Ethio telecom’s Telebirr (`#0072CE`) and CBE Birr (`#6A1A5B` & `#E5A823`).
- **Separation of Concerns**: Portable `paymentService.js` abstraction ready for direct wrapper reuse in native utility mini-apps.
- **Explicit Payment States**: Clearly distinguishes between *Initiated*, *Pending Provider Webhook*, and *Completed* without fake banking claims.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite 6
- **Routing**: React Router DOM v7
- **Styling**: Tailwind CSS + Custom Design System
- **HTTP Client**: Axios with unified interceptors
- **Icons**: Lucide React
- **Typography**: Google Fonts (*Inter* & *Outfit*)

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Henok-SE/smartRentMiniApp.git
cd smartRentMiniApp
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```env
# SmartRent ET Backend API Base URL
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Run Locally

```bash
# Start Vite development server
npm run dev

# Build production bundle
npm run build
```

---

## 📂 Project Architecture

```
smartRentMiniApp/
├── .env.example              # Environment variables template
├── index.html                # Google fonts & SEO meta tags
├── package.json              # Dependencies and scripts
├── tailwind.config.js        # Brand tokens (Telebirr, CBE, Ethiopian accents)
├── vite.config.js            # Vite configuration
└── src/
    ├── main.jsx              # App entry point
    ├── App.jsx               # Navigation & route definitions
    ├── index.css             # Base styles & glassmorphism utilities
    ├── api/
    │   └── client.js         # Configured Axios instance with error handling
    ├── services/
    │   └── paymentService.js # Inquire agreement & initiate payment API calls
    ├── utils/
    │   └── formatters.js     # Currency (ETB), date, and reference formatters
    ├── components/
    │   ├── layout/           # Navbar & Institutional Footer
    │   └── ui/               # Button, Card, Badge, Input primitives
    └── pages/
        ├── HomePage.jsx      # Marketing and trust portal
        ├── PayRentPage.jsx   # 4-step rental payment simulation flow
        └── NotFoundPage.jsx  # 404 Page
```

---

## 💳 Supported Payment Channels (Simulated)

| Provider | Brand Color | Method Identifier |
| :--- | :--- | :--- |
| **Telebirr** | Royal Blue (`#0072CE`) | `TELEBIRR` |
| **Commercial Bank of Ethiopia (CBE)** | Imperial Purple (`#6A1A5B`) & Gold (`#E5A823`) | `CBE` |

---

## 📄 License

Proprietary © SmartRent ET. All rights reserved.