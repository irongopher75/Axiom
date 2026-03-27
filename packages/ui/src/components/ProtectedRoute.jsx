import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getMe } from '../api/index';
import LoadingScreen from './shared/LoadingScreen';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await getMe();
                const user = response.data;
                if (adminOnly && !user?.is_superuser) {
                    throw new Error("Not authorized");
                }
                setIsAuthorized(true);
            } catch (err) {
                localStorage.removeItem('token');
                setShouldRedirect(true);
            } finally {
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [adminOnly]);

    if (isLoading) {
        return <LoadingScreen message="Verifying secure session..." />;
    }

    if (shouldRedirect || !isAuthorized) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
