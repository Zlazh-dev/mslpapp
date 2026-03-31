import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
    hasRole: (targetRole: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
            hasRole: (targetRole: string) => {
                const userObj = get().user;
                if (!userObj || !Array.isArray(userObj.roles)) return false;
                return userObj.roles.includes(targetRole);
            },
        }),
        {
            name: 'mslpapp-auth',
        },
    ),
);
