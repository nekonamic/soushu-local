import { defineStore } from "pinia";

export const useNovelStore = defineStore("novel", {
	state: () => ({
		tid: 0,
		title: "",
		isLoading: true,
	}),
});
