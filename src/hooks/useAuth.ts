import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const authStatus = localStorage.getItem('isAuthenticated');
    const authToken = localStorage.getItem('authToken');

    if (authStatus === 'true' && authToken) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }

    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return {
    isAuthenticated,
    isLoading,
    logout,
    checkAuth,
  };
};
