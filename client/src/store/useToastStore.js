import { create } from "zustand";

export const useToastStore = create((set) => ({
    toasts: [],
    addToast: (message, type = "info") => {
        const id = Date.now();
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }));
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, 4000);
    }
}));
