import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";
import SlideInCart from "./SlideInCart";
import LoginModal from "./LoginModal";
import API from "../utils/api";
import useSiteSettings from "../hooks/useSiteSettings";

const NavBar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { settings } = useSiteSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginModalConfig, setLoginModalConfig] = useState({
    redirectTo: null,
    message: null
  });
  
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch cart count
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        if (!isAuthenticated) {
          // For guests, we might not have a cart yet
          setCartItemCount(0);
          return;
        }

        const { data } = await API.get("/api/cart");
        const totalItems = data.items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;
        setCartItemCount(totalItems);
      } catch (err) {
        console.error("Failed to fetch cart count:", err);
        setCartItemCount(0);
      }
    };

    fetchCartCount();
    
    // Refresh cart count when cart opens
    if (cartOpen) {
      fetchCartCount();
    }
  }, [isAuthenticated, cartOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    navigate("/");
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const openCart = () => {
    setCartOpen(true);
  };

  const closeCart = () => {
    setCartOpen(false);
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginModalConfig({ redirectTo: null, message: null });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate("/products");
      return;
    }
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/products", label: "Products" },
    { path: "/contact", label: "Contact" },
  ];

  const userNavLinks = [
    { path: "/my-orders", label: "My Orders" },
    { path: "/returns", label: "Returns" },
    { path: "/wishlist", label: "Wishlist" },
  ];

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center space-x-3"
              onClick={closeMobileMenu}
            >
              <Logo />
              <span className="text-xl font-bold text-gray-800">{settings.siteName}</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 ml-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
              {/* User-specific links */}
              {user && (
                <>
                  {userNavLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                      {link.label}
                    </Link>
                  ))}
                </>
              )}
            </div>

            {/* Desktop Search */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clothes, brands, categories..."
                  className="w-full border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-4.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-6">
              {/* Cart Button with Badge */}
              <button
                onClick={openCart}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center relative"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="relative" ref={dropdownRef}>
                  {/* User Avatar & Welcome */}
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(user.name)}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs text-gray-500">
                        {user.isAdmin ? "Welcome, Admin" : "Welcome back"}
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {user.name}
                      </p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 border border-gray-100">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-800">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        {user.isAdmin && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <Link
                        to="/my-orders"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        📦 My Orders
                      </Link>
                      <Link
                        to="/returns"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        ↩️ Returns
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        👤 Profile
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        ❤️ Wishlist
                      </Link>
                      <hr className="my-2 border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                  >
                    Login
                  </Link>
                  {settings.allowRegistration && (
                    <Link
                      to="/register"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Register
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-100 pt-4">
              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="mb-4 px-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full border border-gray-300 rounded-lg py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg
                    className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-4.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>

              {/* Cart Button (Mobile) */}
              <button
                onClick={openCart}
                className="w-full flex items-center justify-between px-4 py-3 mb-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center text-gray-700">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Shopping Cart</span>
                </div>
                {cartItemCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {/* User Welcome Message (Mobile) */}
              {user && (
                <div className="px-4 py-3 bg-blue-50 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(user.name)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        {user.isAdmin ? "Welcome, Admin" : "Welcome back"}
                      </p>
                      <p className="font-semibold text-gray-800">{user.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Navigation Links */}
              <div className="space-y-2 mb-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeMobileMenu}
                    className="block px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
                {/* User-specific links */}
                {user &&
                  userNavLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={closeMobileMenu}
                      className="block px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                    >
                      {link.label}
                    </Link>
                  ))}
              </div>

              {/* Mobile User Section */}
              {user ? (
                <div className="space-y-2">
                  <Link
                    to="/profile"
                    onClick={closeMobileMenu}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    👤 Profile
                  </Link>
                  <Link
                    to="/my-orders"
                    onClick={closeMobileMenu}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    📦 My Orders
                  </Link>
                  <Link
                    to="/returns"
                    onClick={closeMobileMenu}
                    className="flex items-center px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                  >
                    ↩️ Returns
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    🚪 Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="block px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors font-medium text-center"
                  >
                    Login
                  </Link>
                  {settings.allowRegistration && (
                    <Link
                      to="/register"
                      onClick={closeMobileMenu}
                      className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
                    >
                      Register
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Slide-in Cart */}
      <SlideInCart isOpen={cartOpen} onClose={closeCart} />

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={closeLoginModal}
        redirectTo={loginModalConfig.redirectTo}
        message={loginModalConfig.message}
      />
    </>
  );
};

export default NavBar;
