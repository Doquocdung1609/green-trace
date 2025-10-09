import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { WalletContextProvider } from './contexts/WalletContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Market from './pages/public/Market';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ConnectWallet from './pages/auth/ConnectWallet';
import FarmerDashboard from './pages/farmer/Dashboard';
import FarmerProducts from './pages/farmer/Products';
import FarmerOrders from './pages/farmer/Orders';
import FarmerAddProduct from './pages/farmer/AddProduct';
import FarmerTrace from './pages/farmer/Trace';
import FarmerProfile from './pages/farmer/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import Shop from './pages/customer/Shop';
import ProductDetail from './pages/customer/ProductDetail';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import CustomerOrders from './pages/customer/Orders';
import CustomerProfile from './pages/customer/Profile';
import { Toaster } from './components/ui/toaster';
import CustomerLayout from './pages/customer/CustomerLayout';
import Users from './pages/admin/Users';
import Products from './pages/admin/Products';
import Reports from './pages/admin/Reports';
import Transactions from './pages/admin/Transactions';
import Orders from './pages/farmer/Orders';
import AdminOrders from './pages/admin/Orders';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WalletContextProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/market" element={<Market />} />

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/connect-wallet" element={<ConnectWallet />} />

              {/* Farmer Routes */}
              <Route element={<ProtectedRoute role="farmer" />}>
                <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                <Route path="/farmer/products" element={<FarmerProducts />} />
                <Route path="/farmer/add-product" element={<FarmerAddProduct />} />
                <Route path="/farmer/trace" element={<FarmerTrace />} />
                <Route path="/farmer/orders" element={<FarmerOrders />} />
                <Route path="/farmer/profile" element={<FarmerProfile />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute role="admin" />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/products" element={<Products />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/transactions" element={<Transactions />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
              </Route>

              {/* Customer Routes */}
              <Route element={<ProtectedRoute role="customer" />}>
                <Route element={<CustomerLayout />}>
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/orders" element={<CustomerOrders />} />
                  <Route path="/profile" element={<CustomerProfile />} />
                </Route>
              </Route>

            </Routes>
          </BrowserRouter>
          <Toaster />
        </WalletContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;