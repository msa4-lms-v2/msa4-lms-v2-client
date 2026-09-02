<script setup>
import MyStatusBadge from '../common/MyStatusBadge.vue';
import { formatCurrency, formatDate } from '../../util/format';
import { TUITION_BILL_STATUS_LABEL, TUITION_BILL_STATUS_VARIANT } from '../../util/payment/enumLabels';

const props = defineProps({
    status: { type: Object, required: true },
});
</script>

<template>
    <section class="status-panel">
        <h3>납부 상태</h3>
        <dl>
            <dt>고지 금액</dt>
            <dd>{{ formatCurrency(props.status.billingAmount) }}</dd>
            <dt>납부 기한</dt>
            <dd>{{ formatDate(props.status.dueDate) }}</dd>
            <dt>상태</dt>
            <dd>
                <MyStatusBadge
                    :label="TUITION_BILL_STATUS_LABEL[props.status.status]"
                    :variant="TUITION_BILL_STATUS_VARIANT[props.status.status]"
                />
            </dd>
        </dl>
    </section>
</template>

<style scoped>
.status-panel {
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
    color: var(--personal-color-text-muted-slate);
}

dd {
    margin: 0;
}
</style>
