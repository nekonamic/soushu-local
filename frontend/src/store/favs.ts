import { defineStore } from 'pinia';
import type { Fav } from '@/types/Fav';

export const useFavsStore = defineStore('favs', {
  state: () => ({
    favs: [] as Fav[],
  }),
});
