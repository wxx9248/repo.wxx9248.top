import IndexView from "@/view/IndexView.vue";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", component: IndexView },
  { path: "/:pathMatch(.*\\/)", component: IndexView }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
