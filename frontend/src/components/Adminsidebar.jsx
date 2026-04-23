import { NavLink, useNavigate } from "react-router-dom";

const Adminsidebar = ({ isOpen = false, onClose = () => {} }) => {
  const navigate = useNavigate();
  const linkClass =
    "block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition";

  const activeClass = "bg-blue-600 text-white";

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("pendingAction");
    navigate("/");
  };

  return (
    <>
      {/* Overlay for mobile when sidebar open */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 p-4 overflow-y-auto z-40 transform transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:fixed md:h-screen md:block`}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between md:hidden mb-4">
          <h1 className="text-white text-xl font-bold">Admin Panel</h1>
          <button onClick={onClose} className="text-gray-300 px-2 py-1">
            ✕
          </button>
        </div>

        {/* Logo for md+ */}
        <h1 className="hidden md:block text-white text-2xl font-bold mb-8 text-center">
          Admin Panel
        </h1>

        {/* Menu */}
        <nav className="space-y-2">
          <NavLink to="/admin" end className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Dashboard
          </NavLink>

          <NavLink to="/admin/products" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Products
          </NavLink>

          <NavLink to="/admin/orders" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Orders
          </NavLink>

          <NavLink to="/admin/refunds" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Refunds
          </NavLink>

          <NavLink to="/admin/users" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Users
          </NavLink>

          <NavLink to="/admin/offers" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Offers
          </NavLink>

          <NavLink to="/admin/reports" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Reports
          </NavLink>

          <NavLink to="/admin/settings" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ''}`}>
            Settings
          </NavLink>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full text-left block px-4 py-3 rounded-lg text-red-400 hover:bg-gray-700 hover:text-red-300 transition mt-8"
          >
            Logout
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Adminsidebar;
