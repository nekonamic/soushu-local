import { defineStore } from "pinia";
import type { Progress } from "@/types/Progress";

export const useProgressStore = defineStore("Progress", {
    state: () => ({
        progress: [] as Progress[],
    }),
});
