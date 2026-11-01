import { useEffect, useState } from "react";
import { api } from "./api/client";

function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await api.get("/health");
        setStatus(data.status);
      } catch (err) {
        setStatus(err.message);
      }
    }

    checkHealth();
  }, []);

  return (
    <div>
      <h1>ShopSphere</h1>
      <p>API status: {status}</p>
    </div>
  );
}

export default App;
