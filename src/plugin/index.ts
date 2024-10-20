/**
 * plugin/index.ts
 *
 * Automatically included in `./src/main.ts`
 */
// Plugins
import { vuetify } from "./Vuetify.ts";
// Types
import type { App } from "vue";


export function registerPlugins(app: App) {
  app.use(vuetify);
}
