<script setup>
import { computed } from 'vue';
import { useTabStore } from '../../store/tab/useTabStore';
import { useAuthStore } from '../../store/auth/useAuthStore';
import { useRouter } from 'vue-router';

const tabStore = useTabStore();
const authStore = useAuthStore();
const router = useRouter();

const roleClass = computed(() => `role-${(authStore.userInfo?.role || 'student').toLowerCase()}`);

const selectTab = (path) => {
    if (tabStore.activeTab !== path) {
        router.push(path);
    }
};

const closeTab = (path, event) => {
    event.stopPropagation();
    tabStore.removeTab(path);
};
</script>

<template>
    <div class="tab-bar" v-if="tabStore.tabs.length > 0">
        <div
            v-for="tab in tabStore.tabs"
            :key="tab.path"
            :class="['tab-item', roleClass, { active: tab.path === tabStore.activeTab }]"
            @click="selectTab(tab.path)"
        >
            <span class="tab-title">{{ tab.title }}</span>
            <button class="close-btn" @click="closeTab(tab.path, $event)">×</button>
        </div>
    </div>
</template>

<style scoped>
.tab-bar {
    display: flex;
    background-color: var(--personal-color-white);
    padding: 8px 8px 0 8px;
    gap: 4px;
    overflow-x: auto;
}

.tab-bar::-webkit-scrollbar {
    height: 4px;
}

.tab-bar::-webkit-scrollbar-thumb {
    background-color: var(--personal-color-border);
    border-radius: 4px;
}

.tab-item {
    display: flex;
    align-items: center;
    background-color: #b5bdc9;
    color: var(--personal-color-white);
    padding: 8px 8px 8px 16px;
    border-radius: 8px 8px 0 0;
    cursor: pointer;
    min-width: 120px;
    max-width: 200px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    border: 1px solid transparent;
    border-bottom: none;
}

.tab-item:hover {
    background-color: #eff2f7;
    color: var(--personal-color-primary-text);
}

.tab-item.role-student.active {
    background-color: var(--personal-color-student-primary);
    color: var(--personal-color-white);
    border-color: var(--personal-color-border);
}

.tab-item.role-professor.active {
    background-color: var(--personal-color-professor-primary);
    color: var(--personal-color-white);
    border-color: var(--personal-color-border);
}

.tab-item.role-admin.active {
    background-color: var(--personal-color-admin-primary);
    color: var(--personal-color-white);
    border-color: var(--personal-color-border);
}

.tab-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 8px;
}

.close-btn {
    background: none;
    border: none;
    color: inherit;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
    padding: 2px 4px;
    margin-left: auto;
    margin-right: -4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    opacity: 1;
    color: var(--personal-color-danger);
}
</style>
