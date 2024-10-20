/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */
// Plugins
// Components
import App from "./App.vue";
import { registerPlugins } from "@/plugin/index.ts";
// Composables
import { createApp } from "vue";
import { router } from "@/router/Router.ts";

const app = createApp(App);

registerPlugins(app);

app.use(router)
app.mount("#app");
