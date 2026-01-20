# Multi-Tenant Inventory Management System

A robust, scalable SaaS platform for managing inventory, suppliers, and orders with complete data isolation for multiple tenants. Built with the MERN stack (MongoDB, Express, React, Node.js).

---

## 🚀 Features

### Core Architecture
- **Multi-Tenancy**: Row-level isolation ensuring complete data privacy between tenants (Tech Gadgets Inc. vs. Fashion Hub).
- **Role-Based Access Control**: Granular permissions for Owner, Manager, and Staff.
- **Real-Time Updates**: Live inventory and order status updates using Socket.io.

### Inventory Management
- **Complex Product Variants**: Support for unlimited variants (Size/Color/Material) per product.
- **Smart Stock Alerts**: Low stock warnings that intelligently account for pending Purchase Orders (avoiding false alarms).
- **Stock Movement History**: Complete audit trail of every item entering or leaving the warehouse.

### Order Processing
- **Concurrency Handling**: Robust atomic transactions prevent race conditions (e.g., stopping two users from buying the last item).
- **Purchase Orders**: Full workflow from Draft → Sent → Confirmed → Received, with partial delivery support.
- **Supplier Management**: Track supplier performance and pricing.

### Dashboard & Analytics
- **Performance Metrics**: Real-time view of Total Inventory Value, Low Stock Items, and Top Sellers.
- **Visualizations**: Interactive charts for stock movements and sales trends.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, TanStack Query, Recharts, Framer Motion.
- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose).
- **Security**: JWT Authentication, BCrypt hashing, CORS, Helmet.
- **Real-Time**: Socket.io for bi-directional communication.

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas URL)

### 1. Clone & Install
```bash
git clone <repository-url>
cd inventoy-saas

# Install Backend Dependencies
cd backend
npm install

# Install Frontend Dependencies
cd ../frontend
npm install
```

### 2. Environment Setup
Create `.env` files in both directories:

**backend/.env**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/inventory-saas
JWT_SECRET=your_super_secret_key_change_this
NODE_ENV=development
```

**frontend/.env**
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Seed Database (Critical Step!)
We have prepared a seed script that populates the database with 2 distinct tenants and sample data.

```bash
cd backend
npm run seed
```

### 4. Run the Application
You can run both servers concurrently or in separate terminals.

**Backend**
```bash
cd backend
npm run dev
```

**Frontend**
```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:5173`.

---

## 🧪 Test Credentials

The seed script creates two isolated tenants. You can log in to verify data isolation.

### Tenant 1: Tech Gadgets Inc.
*Inventory: Electronics (Smartphones, Laptops)*
- **Owner**: `owner1@techgadgets.com` / `password123`
- **Staff**: `staff1@techgadgets.com` / `password123`

### Tenant 2: Fashion Hub
*Inventory: Apparel (T-Shirts, Jeans)*
- **Owner**: `owner2@fashionhub.com` / `password123`
- **Manager**: `manager2@fashionhub.com` / `password123`

---

## 📐 Architecture & Decisions

Please refer to [ARCHITECTURE.md](./ARCHITECTURE.md) for a deep dive into:
- Multi-tenancy implementation (Row-Level Isolation)
- Data modeling for Product Variants
- Concurrency control strategy
- Performance optimizations

---

## ⏱️ Time Breakdown (Approx. 18 Hours)

- **System Design & Architecture**: 3 hours
- **Backend Core (Auth, Tenants, middleware)**: 3 hours
- **Inventory & Order Logic (Complex requirements)**: 5 hours
- **Frontend Development (UI/UX, State)**: 5 hours
- **Refactoring, Doc, & Testing**: 2 hours

---

## ⚠️ Known Limitations & Assumptions

1. **Currency**: Currently defaults to USD for all reporting, though Tenant model supports currency selection.
2. **Reporting**: "Top Sellers" calculation assumes sales data exists (please place some orders first!).
3. **Variants**: UI currently supports adding variants but bulk editing is limited.

---

## 📦 API Documentation

### Auth
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/low-stock` - Get smart alerts

### Orders
- `POST /api/orders` - Place new order (Atomic)
- `GET /api/orders` - List tenant orders

### Purchase Orders
- `POST /api/purchase-orders` - Create PO
- `PUT /api/purchase-orders/:id/status` - Update status (updates stock)
