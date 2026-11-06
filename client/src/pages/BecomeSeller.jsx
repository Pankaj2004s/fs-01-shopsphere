import { useState } from "react";
import { becomeVendor } from "../api/users";
import { useAuth } from "../hooks/useAuth";

function BecomeSeller() {
  const { user, token, updateUser } = useAuth();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isVendor = user.role === "vendor";

  async function handleBecomeSeller() {
    setError("");
    setSubmitting(true);

    try {
      const data = await becomeVendor(token);
      updateUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md sm:mt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Sell on ShopSphere
        </h1>

        {isVendor ? (
          <p
            role="status"
            className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            You are a seller. You can now list products.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Turn your account into a seller account to list products and
              manage orders.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleBecomeSeller}
              disabled={submitting}
              className="mt-6 w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Please wait..." : "Become a seller"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default BecomeSeller;
