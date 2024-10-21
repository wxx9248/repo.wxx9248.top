<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

(() => {
  const { searchParams } = new URL(location.href);
  if (!searchParams.size) {
    return;
  }

  const path = searchParams.get("path");
  if (!path) {
    return;
  }

  router.replace(path);
})();
</script>
