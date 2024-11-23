import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, fetchApiKeys } from '@/utilities/firebaseClient';

interface UserData {
  uid: string | null;
  apiKeys: string[] | null;
}

const AuthContext = createContext<[UserData, React.Dispatch<React.SetStateAction<UserData>>]>([
  { uid: null, apiKeys: null },
  () => {},
]);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userData, setUserData] = useState<UserData>({ uid: null, apiKeys: null });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const apiKeys = await fetchApiKeys(user.uid);
          setUserData({ uid: user.uid, apiKeys });
        } catch (error) {
          console.error('Error fetching API keys:', error);
          setUserData({ uid: user.uid, apiKeys: null });
        }
      } else {
        setUserData({ uid: null, apiKeys: null });
      }
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={[userData, setUserData]}>{children}</AuthContext.Provider>;
};

export const useAuth = (): [UserData, React.Dispatch<React.SetStateAction<UserData>>] =>
  useContext(AuthContext);
