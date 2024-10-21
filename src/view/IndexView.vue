<template>
  <v-container>
    <v-app-bar app density="compact">
      <v-breadcrumbs :items="breadcrumbItems">
        <template #prepend>
          <v-icon icon="mdi-folder" size="x-small" class="ma-3"></v-icon>
        </template>
        <template #item="{ item }">
          <v-breadcrumbs-item :to="item.to" exact :disabled="item.disabled">
            {{ item.title }}
          </v-breadcrumbs-item>
        </template>
      </v-breadcrumbs>
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
              <RouterLink v-if="item.type === 'folder'" :to="`${item.link}`">{{
                item.name
              }}</RouterLink>
              <a v-if="item.type === 'file'" :href="`${item.link}`">{{
                item.name
              }}</a>
            </template>
          </v-data-table>
        </v-card>
      </v-container>
    </v-main>
  </v-container>
</template>

<script lang="ts" setup>
import { Folder } from "@/../common/FileSystem.ts";
import { index } from "@/index.ts";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const rawPath = ref("");
watch(
  () => route.path,
  (newRawPath) => {
    rawPath.value = newRawPath;
  },
  { immediate: true }
);

const pathSegments = computed(() =>
  rawPath.value.split("/").filter((v) => v !== "")
);
function generatePathFromSegment(pathSegments) {
  return pathSegments.length !== 0 ? `/${pathSegments.join("/")}/` : "/";
}

const breadcrumbItems = computed(() =>
  ["root", ...pathSegments.value].map((value, index, array) => ({
    title: value,
    disabled: index === array.length - 1,
    to: index === 0 ? "/" : generatePathFromSegment(array.slice(1, index + 1))
  }))
);
const path = computed(() => generatePathFromSegment(pathSegments.value));

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

const rootNode = index as Folder;
const items = ref([]);
watch(
  pathSegments,
  (newPathSegments) => {
    items.value = [];

    let currentNode = rootNode;
    try {
      for (const segment of newPathSegments) {
        currentNode = currentNode.folderEntries[segment];
      }
      if (!currentNode) {
        throw new URIError();
      }

      for (const [name] of Object.entries(currentNode.folderEntries)) {
        items.value.push({
          type: "folder",
          name: `${name}/`,
          size: "-",
          link: `${name}/`
        });
      }

      for (const [name, { size }] of Object.entries(currentNode.fileEntries)) {
        items.value.push({ type: "file", name: name, size: size, link: name });
      }
    } catch ({}) {
      console.error(`Invalid path: ${path.value}`);
    }
  },
  { immediate: true }
);
</script>
