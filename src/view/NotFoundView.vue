<template>
  <v-container
    id="container"
    class="d-flex flex-column align-center justify-center"
  >
    <h1 id="title">404</h1>
    <h2 id="subtitle">Page Not Found</h2>
    <v-btn
      id="button-homepage"
      append-icon="mdi-home"
      size="large"
      @click="onButtonHomepagePress"
      >Homepage</v-btn
    >
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
function onButtonHomepagePress() {
  router.push("/");
}
</script>

<style scoped>
#container {
  width: 100%;
  height: 100%;
  user-select: none;
}

#title {
  font-size: 10rem;
}

#subtitle {
  font-size: 1.5rem;
}

#button-homepage {
  position: absolute;
  top: 10px;
  right: 10px;
}
</style>
