import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
    password?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    users: User[]; // Mock database
    login: (user: User) => void;
    logout: () => void;
    registerUser: (user: User) => void;
    updateUserRole: (id: string, role: "admin" | "user") => void;
    deleteUser: (id: string) => void;
    resetUserPassword: (id: string, newPassword: string) => void;
}

const defaultAdmin: User = {
    id: "1",
    name: "Admin",
    email: "admin@admin.com",
    role: "admin",
    password: "anypassword",
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            users: [defaultAdmin],
            login: (user) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false }),
            registerUser: (user) => set((state) => ({ users: [...state.users, user] })),
            updateUserRole: (id, role) => set((state) => ({
                users: state.users.map((u) => (u.id === id ? { ...u, role } : u)),
                // If the logged in user is updated, we should also update their session state
                user: state.user?.id === id ? { ...state.user, role } : state.user
            })),
            deleteUser: (id) => set((state) => ({
                users: state.users.filter((u) => u.id !== id),
                // If the logged in user is deleted, log them out
                user: state.user?.id === id ? null : state.user,
                isAuthenticated: state.user?.id === id ? false : state.isAuthenticated
            })),
            resetUserPassword: (id, newPassword) => set((state) => ({
                users: state.users.map((u) => (u.id === id ? { ...u, password: newPassword } : u)),
                user: state.user?.id === id ? { ...state.user, password: newPassword } : state.user
            })),
        }),
        {
            name: "auth-storage", // unique name for localStorage key
        }
    )
);
