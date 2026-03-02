<template>
  <nav aria-label="Drobková navigace" class="breadcrumb">
    <ol>
      <li v-for="(crumb, i) in items" :key="i">
        <router-link v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</router-link>
        <span v-else aria-current="page">{{ crumb.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
})
</script>

<style scoped>
.breadcrumb {
  margin-bottom: var(--space-md);
}

.breadcrumb ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  font-size: 0.85rem;
}

.breadcrumb li + li::before {
  content: '/';
  margin: 0 0.4em;
  color: var(--text-muted);
}

.breadcrumb a {
  color: var(--text-muted);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--text);
  text-decoration: underline;
}

.breadcrumb [aria-current="page"] {
  color: var(--text);
  font-weight: 500;
}
</style>
