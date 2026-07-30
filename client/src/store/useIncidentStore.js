import { create } from "zustand";

export const useIncidentStore = create((set) => ({
    unresolvedCount: 0,
    setUnresolvedCount: (count) => set({ unresolvedCount: count})
}));