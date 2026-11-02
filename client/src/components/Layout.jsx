import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-50 text-brand-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-brand-600"
          >
            ShopSphere
          </Link>

          <div className="flex items-center gap-1">
            <NavLink to="/products" className={navLinkClass}>
              Products
            </NavLink>
            {!loading && user && (
              <>
                <NavLink to="/cart" className={navLinkClass}>
                  Cart
                </NavLink>
                <NavLink to="/orders" className={navLinkClass}>
                  Orders
                </NavLink>
                <span className="ml-3 hidden text-sm text-slate-500 sm:inline">
                  Hi, {user.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="ml-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            )}
            {!loading && !user && (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <Link
                  to="/register"
                  className="ml-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-slate-500">
          ShopSphere, a MERN capstone project
        </p>
      </footer>
    </div>
  );
}

export default Layout;
