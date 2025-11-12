import { defineStore } from "pinia";
import type { Record } from "@/api/main";

export const useSearchStore = defineStore("search", {
	state: () => ({
		keyword: "",
		target: "title" as "title" | "author" | "content" | "both",
		page: 1,
		records: [] as Record[],
		total: 0,
	}),
});
