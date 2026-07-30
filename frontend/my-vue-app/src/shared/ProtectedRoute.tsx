import { useEffect, useState, type ReactNode,} from "react";
import { Navigate, useLocation} from "react-router-dom";

type ProtectedRouteProps = {
  children: ReactNode;
  checkEndpoint: string;
};
type AccessStatus =
  | "checking"
  | "authorized"
  | "unauthenticated"
  | "forbidden"
  | "error";
export default function ProtectedRoute({ children, checkEndpoint,}: ProtectedRouteProps) {
  const location = useLocation();
  const [status, setStatus] =
    useState<AccessStatus>("checking");

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:3000/api";
  useEffect(() => {
    const controller = new AbortController();
    async function checkAccess() {
      setStatus("checking");
      try {
        const response = await fetch(
          `${API_BASE_URL}${checkEndpoint}`,
          {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
          },
        );

        if (response.ok) {
          setStatus("authorized");
          return;
        }

        if (response.status === 401) {
          setStatus("unauthenticated");
          return;
        }

        if (response.status === 403) {
          setStatus("forbidden");
          return;
        }

        setStatus("error");
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) return;
        console.error("Protected route check failed:", error);
        setStatus("error");
      }
    }
    void checkAccess();
    return () => { controller.abort();};
  }, [API_BASE_URL, checkEndpoint]);
  if (status === "checking") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#111111",
          color: "#ffffff",
        }}
      >
        <p>Checking administrator permission...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (status === "forbidden") {
    return <Navigate to="/" replace />;
  }

  if (status === "error") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div>
          <h1>Unable to verify access</h1>
          <p>Please check whether the backend is running.</p>
        </div>
      </main>
    );
  }

  return children;
}