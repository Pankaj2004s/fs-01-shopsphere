import { Link, Outlet } from "react-router-dom";

function Layout() {
  return (
    <div>
      <header>
        <nav>
          <Link to="/">ShopSphere</Link>
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
