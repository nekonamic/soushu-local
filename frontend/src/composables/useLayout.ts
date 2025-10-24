import { updatePrimaryPalette } from "@primeuix/themes";
import { computed, ref } from "vue";

const appState = ref({
    darkMode: false
});

const colors ={
    name: "violet",
    palette: {
        50: "#f5f3ff",
        100: "#ede9fe",
        200: "#ddd6fe",
        300: "#c4b5fd",
        400: "#a78bfa",
        500: "#8b5cf6",
        600: "#7c3aed",
        700: "#6d28d9",
        800: "#5b21b6",
        900: "#4c1d95",
        950: "#2e1065"
    }
}

export function useLayout() {
    function toggleDarkMode() {
        appState.value.darkMode = !appState.value.darkMode;
        document.documentElement.classList.toggle("p-dark");
    }

    function setColors() {
        updatePrimaryPalette(colors.palette);
    }

    const isDarkMode = computed(() => appState.value.darkMode);

    return {
        isDarkMode,
        toggleDarkMode,
        setColors,
    };
}