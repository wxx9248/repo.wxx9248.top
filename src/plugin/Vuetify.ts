/**
 * plugin/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */
// Styles
import "@mdi/font/css/materialdesignicons.css";
// Composables
import { createVuetify } from "vuetify";
import "vuetify/styles";

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export const vuetify = createVuetify({
  theme: {
    defaultTheme: "dark"
  }
});
