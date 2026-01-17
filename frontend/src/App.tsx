import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/dashboard/Dashboard.tsx';
import Login from './pages/Login.tsx';
import Inventory from './pages/inventory/Inventory.tsx';
import Orders from './pages/Orders.tsx';
import PurchaseOrders from './pages/PurchaseOrders.tsx';
import Suppliers from './pages/suppliers/Suppliers.tsx';
import Signup from './pages/Signup.tsx';

import { SocketProvider } from './contexts/SocketContext';
import { Toaster } from 'react-hot-toast';
import Profile from './pages/Profile.tsx';
import Organization from './pages/Organization.tsx';
import Vendor from './pages/vendor/Vendor.tsx';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/organization" element={<ProtectedRoute><Organization /></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><Vendor /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
