import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div>
      <header>
        <nav>
          <Link to="/">ShopSphere</Link>{" "}
          <Link to="/products">Products</Link>{" "}
          {!loading && user && (
            <>
              <span>Hi, {user.name}</span>{" "}
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link to="/login">Login</Link>{" "}
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <p>ShopSphere, a MERN capstone project</p>
      </footer>
    </div>
  );
}

export default Layout;
