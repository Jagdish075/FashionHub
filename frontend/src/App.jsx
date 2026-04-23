import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Contact from "./pages/Contact";
import AdminDashboard, { DashboardStats } from "./pages/AdminDashboard";
import TrackOrder from "./pages/TrackOrder";
import Adminsidebar from "./components/Adminsidebar";
import Adminproduct from "./admin-pages/Adminproduct";
import Order from "./admin-pages/Order";
import Usercheck from "./admin-pages/Usercheck";
import AdminSettings from "./admin-pages/AdminSettings";
import Offers from "./admin-pages/Offers";
import Refunds from "./admin-pages/Refunds";
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import Profile from "./pages/Profile";
import Returns from "./pages/Returns";
import Wishlist from "./pages/Wishlist";
import { AuthProvider, SessionWarning } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import UserChatBot from "./components/UserChatBot";
import SalesReports from "./admin-pages/SalesReports";

function Layout() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  // admin page check
  const isAdminPage = location.pathname.startsWith("/admin");
  const isAuthPage =
    location.pathname.startsWith("/login") || location.pathname.startsWith("/register");
  const showChatBot = isAuthenticated && !user?.isAdmin && !isAdminPage && !isAuthPage;

  return (
    <>
      {!isAdminPage && <NavBar />}
      <SessionWarning />
      <ToastContainer position="top-right" autoClose={2500} newestOnTop />
      {showChatBot && <UserChatBot />}

      <Routes>
        {/* PUBLIC ROUTES - Accessible without login */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* AUTH ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* PROTECTED USER ROUTES - Require authentication */}
        <Route 
          path="/cart" 
          element={
            <ProtectedRoute requireAuth={true}>
              <Cart />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/checkout" 
          element={
            <ProtectedRoute requireAuth={true}>
              <Checkout />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-orders" 
          element={
            <ProtectedRoute requireAuth={true}>
              <MyOrders />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute requireAuth={true}>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/returns"
          element={
            <ProtectedRoute requireAuth={true}>
              <Returns />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute requireAuth={true}>
              <Wishlist />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/order/:trackingId" 
          element={
            <ProtectedRoute requireAuth={true}>
              <OrderDetails />
            </ProtectedRoute>
          } 
        />
        <Route path="/track" element={<TrackOrder />} />
        
        {/* Payment routes - protected but handle success/fail gracefully */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failed" element={<PaymentFailed />} />
        
        {/* ADMIN ROUTES - Require admin role */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAuth={true} requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardStats />} />
          <Route path="products" element={<Adminproduct />} />
          <Route path="orders" element={<Order />} />
          <Route path="refunds" element={<Refunds />} />
          <Route path="users" element={<Usercheck />} />
          <Route path="offers" element={<Offers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="reports" element={<SalesReports />} />
        </Route>
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
