const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let loading = null;

export function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }
  if (loading) {
    return loading;
  }

  loading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loading = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return loading;
}
