import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/authStore";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [, setLocation] = useLocation();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) {
            setLocation("/login");
        }
    }, [isAuthenticated, setLocation]);

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
}
