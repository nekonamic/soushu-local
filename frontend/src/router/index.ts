import { createRouter, createWebHistory } from "vue-router";
import Main from "@/views/Home.vue";
import Viewer from "@/views/Viewer.vue";
import SearchDoc from "@/views/SearchDoc.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "main",
			component: Main,
		},
		{
			path: "/:tid",
			name: "viewer",
			component: Viewer,
		},
		{
			path: "/doc",
			name: "doc",
			component: SearchDoc,
		},
	],
});

export default router;
