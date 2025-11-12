import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import { createPinia } from "pinia";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";

// 导入 PrimeVue 组件
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Tooltip from 'primevue/tooltip';

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

// 注册 PrimeVue 组件
app.component('Dialog', Dialog);
app.component('Button', Button);
app.component('InputText', InputText);

// 注册指令
app.directive('tooltip', Tooltip);

app.mount("#app");