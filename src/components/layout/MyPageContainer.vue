<script setup>
defineProps({
    title: {
        type: String,
        required: false,
    },
    subtitle: {
        type: String,
        required: false,
    },
});
</script>

<template>
    <div class="page-container">
        <div v-if="title" class="page-heading">
            <h2>{{ title }}</h2>
            <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <slot></slot>
    </div>
</template>

<style scoped>
.page-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 50px;
    color: var(--primary-text-color);
}

.page-heading {
    padding-bottom: 10px;
}

.page-heading h2 {
    margin-bottom: 8px;
    color: var(--primary-text-color);
    letter-spacing: 0;
    font-size: 1.5rem;
    font-weight: 800;
}

.page-heading p {
    color: var(--primary-text-color);
    font-size: 1rem;
}
</style>
