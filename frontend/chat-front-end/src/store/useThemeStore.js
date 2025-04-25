import { create } from "zustand";


export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("chat-theme") || "light" || "acid",
    setTheme: (theme) => {
        localStorage.setItem("chat-theme", theme);
        set({theme});
    },
}));