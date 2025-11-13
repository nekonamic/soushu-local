import type { Fav } from "@/types/Fav";
import type { Progress } from "@/types/Progress";
import { useLocalStorage } from "@vueuse/core";

const progress = useLocalStorage<Progress[]>("progress", []);

const favorites = useLocalStorage<Fav[]>("favorites", []);

const history = useLocalStorage<string[]>("history", []);

export const useProgress = () => progress;
export const useFavorites = () => favorites;
export const useHistory = () => history;
