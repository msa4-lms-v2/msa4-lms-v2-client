<script setup>
import { formatCurrency } from '../../util/format';

const props = defineProps({
    allocation: { type: Object, required: true },
});
</script>

<template>
    <section class="allocation-panel">
        <h3>장학금·실납부액</h3>
        <dl>
            <dt>고지 금액</dt>
            <dd>{{ formatCurrency(props.allocation.billingAmount) }}</dd>
            <dt>장학금 합계</dt>
            <dd>{{ formatCurrency(props.allocation.totalScholarshipAmount) }}</dd>
            <dt>실납부액</dt>
            <dd class="highlight">{{ formatCurrency(props.allocation.actualPaymentAmount) }}</dd>
        </dl>
    </section>
</template>

<style scoped>
.allocation-panel {
    background: var(--personal-color-white);
    border-radius: var(--personal-radius-card);
    padding: 24px;
}

dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
    margin: 0;
}

dt {
    color: var(--personal-color-text-muted);
}

dd {
    margin: 0;
}

.highlight {
    font-weight: 700;
}
</style>
