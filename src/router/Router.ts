import { createMemoryHistory, createRouter, createWebHashHistory } from "vue-router";
import IndexView from "@/view/IndexView.vue";

const routes = [
  { path: '/:pathMatch(.*)', component: IndexView }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
