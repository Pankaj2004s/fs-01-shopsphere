import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 text-slate-500">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700 active:scale-95"
      >
        Go back home
      </Link>
    </div>
  );
}

export default NotFound;
