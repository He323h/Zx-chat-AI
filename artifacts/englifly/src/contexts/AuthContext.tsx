import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getMockUser, mockSignOut, type MockUser } from "@/lib/mockAuth";
import { showReminderIfNeeded } from "@/lib/notifications";

interface AuthContextType {
  user: User | MockUser | null;
  loading: boolean;
  isConfigured: boolean;
  isMockMode: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  isMockMode: false,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const mockUser = getMockUser();
      setUser(mockUser);
      setLoading(false);

      const onStorage = () => setUser(getMockUser());
      window.addEventListener("englifly:auth", onStorage);
      return () => window.removeEventListener("englifly:auth", onStorage);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setTimeout(() => showReminderIfNeeded(), 3000);
      }
    });
    return () => unsubscribe();
  }, []);

  function logout() {
    if (!isFirebaseConfigured) {
      mockSignOut();
      setUser(null);
    } else if (auth) {
      import("firebase/auth").then(({ signOut }) => signOut(auth!));
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        isMockMode: !isFirebaseConfigured,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
