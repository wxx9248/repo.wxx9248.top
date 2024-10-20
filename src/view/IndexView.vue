<template>
  <v-container>
    <v-app-bar app density="compact">
      <v-toolbar-title>{{ $route.fullPath }}</v-toolbar-title>
    </v-app-bar>
    <v-main>
      <v-container>
        <v-card>
          <template #text>
            <v-text-field
              v-model="search"
              density="compact"
              label="Search by name"
              prepend-inner-icon="mdi-magnify"
              variant="solo-filled"
              hide-details
              single-line
            ></v-text-field>
          </template>
          <v-data-table
            :headers="headers"
            :items="items"
            :search="search"
            :sort-by="[]"
            :items-per-page="10"
            class="elevation-1"
          >
            <template #[`item.name`]="{ item }">
              <RouterLink :to="`${item.link}`">{{ item.name }}</RouterLink>
            </template>
          </v-data-table>
        </v-card>
      </v-container>
    </v-main>
  </v-container>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const path = ref("/");
const items = ref([]);
const search = ref("");

const headers = [
  {
    title: "Name",
    value: "name",
    sortable: true
  },
  {
    title: "Size",
    value: "size",
    sortable: true
  }
];
</script>
