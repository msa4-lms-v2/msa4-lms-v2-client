<script setup>
import { ref } from 'vue';
import { SCHOLARSHIP_TYPE_LABEL } from '../../util/payment/enumLabels';

const props = defineProps({
    isSubmitting: { type: Boolean, default: false },
});
const emit = defineEmits(['submit']);

const type = ref('MERIT');
const amount = ref(null);
const reason = ref('');

const handleSubmit = () => {
    emit('submit', { type: type.value, amount: amount.value, reason: reason.value });
    amount.value = null;
    reason.value = '';
};
</script>

<template>
    <form class="scholarship-form" @submit.prevent="handleSubmit">
        <h3>장학금 감면·면제 적용</h3>

        <div class="field">
            <label for="scholarship-type">장학금 유형</label>
            <select id="scholarship-type" v-model="type">
                <option v-for="(label, value) in SCHOLARSHIP_TYPE_LABEL" :key="value" :value="value">
                    {{ label }}
                </option>
            </select>
        </div>

        <div class="field">
            <label for="scholarship-amount">감면 금액</label>
            <input id="scholarship-amount" v-model.number="amount" type="number" min="0.01" step="0.01" required />
        </div>

        <div class="field">
            <label for="scholarship-reason">사유</label>
            <input id="scholarship-reason" v-model="reason" type="text" required />
        </div>

        <button type="submit" :disabled="props.isSubmitting">
            {{ props.isSubmitting ? '적용 중...' : '적용' }}
        </button>
    </form>
</template>

<style scoped>
.scholarship-form {
    background: var(--personal-color-white);
    border-radius: var(--personal-radius-card);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

input,
select {
    padding: 8px 12px;
    border-radius: var(--personal-radius);
    border: 1px solid #cbd5e1;
}

button {
    align-self: flex-start;
    padding: 10px 20px;
    border: none;
    border-radius: var(--personal-radius);
    background: var(--personal-color-admin-secondary);
    color: var(--personal-color-white);
    cursor: pointer;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
</style>
