import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { SuiWalletContextProvider } from './contexts/SuiWalletContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import FarmerDashboard from './pages/farmer/Dashboard';
import FarmerProducts from './pages/farmer/Products';
import FarmerAddProduct from './pages/farmer/AddProductSui';
import FarmerProfile from './pages/farmer/Profile';
import Shop from './pages/customer/Shop';
import ProductDetail from './pages/customer/ProductDetail';
import Cart from './pages/customer/Cart';                
import Checkout from './pages/customer/Checkout';       
import Orders from './pages/customer/Orders';   
import OrdersFarmer from './pages/farmer/Orders';         
import CustomerProfile from './pages/customer/Profile';
import { Toaster } from './components/ui/toaster';
import CustomerLayout from './pages/customer/CustomerLayout';

import EditProduct from './pages/farmer/EditProduct';
import { WalletConnector } from './components/WalletConnector';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SuiWalletContextProvider>
          <BrowserRouter>
            <WalletConnector />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Farmer Routes */}
              <Route element={<ProtectedRoute role="farmer" />}>
                <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                <Route path="/farmer/products" element={<FarmerProducts />} />
                <Route path="/farmer/add-product" element={<FarmerAddProduct />} />
                <Route path="/farmer/profile" element={<FarmerProfile />} />
                <Route path="/farmer/edit-product/:id" element={<EditProduct />} />
                <Route path="/farmer/orders" element={<OrdersFarmer />} />
              </Route>

              {/* Customer Routes - tất cả đều nằm trong CustomerLayout */}
              <Route element={<ProtectedRoute role="customer" />}>
                <Route element={<CustomerLayout />}>
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  
                  {/* Các route mới cho nhà đầu tư */}
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/orders" element={<Orders />} />
                  
                  <Route path="/profile" element={<CustomerProfile />} />
                </Route>
              </Route>

            </Routes>
          </BrowserRouter>
          <Toaster />
        </SuiWalletContextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;