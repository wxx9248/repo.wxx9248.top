import IndexView from "@/view/IndexView.vue";
import NotFoundView from "@/view/NotFoundView.vue";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  { path: "/", component: IndexView },
  { path: "/:pathMatch(.*\\/)", component: IndexView },
  { path: "/:pathMatch(.*)", component: NotFoundView }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
