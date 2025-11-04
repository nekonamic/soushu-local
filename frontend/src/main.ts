import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import { createPinia } from "pinia";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(PrimeVue, {
	theme: {
		preset: Aura,
		options: {
			darkModeSelector: ".p-dark",
		},
	},
});
app.use(pinia);
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
