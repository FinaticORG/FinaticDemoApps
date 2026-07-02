/**
 * Main App Component - UI Only
 *
 * This component demonstrates the UI layer. All SDK logic is separated
 * into src/sdk.ts for clarity. See that file to understand how to use
 * the Finatic Client SDK.
 */

import { useState, useEffect } from "react";
import {
  initializeSDK,
  isAuthenticated,
  getUserId,
  openPortal,
  listAccounts,
  getAccount,
} from "./sdk";
import "./App.css";

function App() {
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    userId: null as string | null,
  });

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountResult, setAccountResult] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Initialize SDK on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await initializeSDK();
        updateAuthStatus();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize SDK",
        );
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Update authentication status
  const updateAuthStatus = () => {
    setAuthStatus({
      isAuthenticated: isAuthenticated(),
      userId: getUserId(),
    });
  };

  // Check auth status periodically
  useEffect(() => {
    const interval = setInterval(updateAuthStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleListAccounts = async () => {
    if (!authStatus.isAuthenticated) {
      setAccountError("Please authenticate first");
      return;
    }

    setLoadingAccounts(true);
    setAccountError(null);
    setAccountResult(null);

    try {
      const result = await listAccounts();
      setAccountResult(result);
      console.log("Accounts loaded:", result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load accounts";
      setAccountError(errorMessage);
      console.error("Error loading accounts:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleGetFirstAccount = async () => {
    const accounts = accountResult?.success?.data ?? accountResult?.data ?? [];
    const firstAccountId = Array.isArray(accounts)
      ? accounts[0]?.accountId || accounts[0]?.id
      : null;
    if (!firstAccountId) {
      setAccountError(
        "Load accounts first, then choose an account id from the response.",
      );
      return;
    }

    setLoadingAccounts(true);
    setAccountError(null);
    try {
      setAccountResult(await getAccount(firstAccountId));
    } catch (err) {
      setAccountError(
        err instanceof Error ? err.message : "Failed to load account",
      );
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Handle portal authentication
  const handleOpenPortal = async () => {
    try {
      await openPortal({
        onSuccess: () => {
          updateAuthStatus();
        },
        onError: (err: Error) => {
          setError(err.message);
        },
        onClose: () => {
          console.log("Portal closed");
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open portal");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <h1>Finatic Client SDK Demo</h1>
          <p>Initializing SDK...</p>
        </div>
      </div>
    );
  }

  // Error state (before SDK initialized)
  if (error && !authStatus.isAuthenticated) {
    return (
      <div className="app">
        <div className="container">
          <h1>Finatic Client SDK Demo</h1>
          <div className="error">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>Finatic Client SDK Demo</h1>
          <div className="auth-status">
            <span
              className={`status ${
                authStatus.isAuthenticated
                  ? "authenticated"
                  : "not-authenticated"
              }`}
            >
              {authStatus.isAuthenticated
                ? "✓ Authenticated"
                : "✗ Not Authenticated"}
            </span>
            {authStatus.userId && (
              <span className="user-id">User: {authStatus.userId}</span>
            )}
          </div>
        </header>

        {error && <div className="error">Error: {error}</div>}

        {!authStatus.isAuthenticated && (
          <div className="auth-section">
            <h2>Authentication Required</h2>
            <p>
              Click the button below to authenticate via the Finatic portal.
            </p>
            <button onClick={handleOpenPortal} className="btn btn-primary">
              Open Authentication Portal
            </button>
          </div>
        )}

        {authStatus.isAuthenticated && (
          <div className="data-section">
            <div className="actions">
              <button
                onClick={handleListAccounts}
                className="btn btn-primary"
                disabled={loadingAccounts}
              >
                {loadingAccounts ? "Loading..." : "List Accounts"}
              </button>
              <button
                onClick={handleGetFirstAccount}
                className="btn btn-secondary"
                disabled={loadingAccounts || !accountResult}
              >
                Get First Account
              </button>
            </div>

            {accountError && (
              <div className="error" style={{ marginTop: "1rem" }}>
                Account Error: {accountError}
              </div>
            )}

            {accountResult && (
              <div className="data-card" style={{ marginTop: "1rem" }}>
                <h3>Account Result</h3>
                <pre
                  style={{
                    background: "#f5f5f5",
                    padding: "1rem",
                    borderRadius: "4px",
                    overflow: "auto",
                    maxHeight: "400px",
                  }}
                >
                  {JSON.stringify(accountResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
