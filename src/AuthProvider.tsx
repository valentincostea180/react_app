import React from "react";
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig, loginRequest, allowedUsers } from "./authConfig.ts";

const msalInstance = new PublicClientApplication(msalConfig);

// Auth context for user information
interface AuthContextType {
  user: any;
  isAllowed: boolean;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isAllowed: false,
});

// Component to handle authentication logic
const AuthContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = React.useState<any>(null);
  const [isAllowed, setIsAllowed] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const currentAccount = accounts[0];
      setUser(currentAccount);

      // Check if user is in the allowed list
      const userEmail = currentAccount.username.toLowerCase();
      const isUserAllowed = allowedUsers.some(
        (allowed) => allowed.toLowerCase() === userEmail
      );

      setIsAllowed(isUserAllowed);

      if (!isUserAllowed) {
        // If user is not allowed, show message and optionally sign them out
        console.warn(
          `User ${userEmail} is not authorized to access this application.`
        );
      }
    } else {
      setUser(null);
      setIsAllowed(false);
    }
  }, [isAuthenticated, accounts]);

  const login = async () => {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => {
    instance.logoutPopup();
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <h1>DMS-2 Digitalization Tool</h1>
            <p style={{ paddingBottom: "20px" }}>
              Please sign in to access the application
            </p>
            <button className="btn-inapoi btn-primary" onClick={login}>
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show unauthorized message if user is authenticated but not allowed
  if (!isAllowed) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <h1>Access Denied</h1>
            <p>
              Your account ({user?.username}) is not authorized to access this
              application. Please contact the administrator.
            </p>
            <button className="btn btn-secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and allowed - show the app
  return (
    <AuthContext.Provider value={{ user, isAllowed }}>
      <div>
        <nav className="navbar navbar-dark">
          <div className="container-fluid">
            <div className="navbar-text" style={{ paddingLeft: "20px" }}>
              Signed in as: <strong>{user?.username}</strong>
            </div>
            <button
              className="btn btn-outline-light btn-sm ms-2"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </nav>
        {children}
      </div>
    </AuthContext.Provider>
  );
};

// Main Auth Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthContent>{children}</AuthContent>
    </MsalProvider>
  );
};

// Hook to use auth context
export const useAuth = () => React.useContext(AuthContext);
