import { defineStore } from 'pinia';
import type { Novel } from '@/api/main';

export const useSearchStore = defineStore('search', {
  state: () => ({
    keyword: '',
    target: 'title' as 'title' | 'content' | 'both',
    page: 1,
    records: [] as Novel[],
    total: 0,
  }),
});
