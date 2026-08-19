<script setup>
const props = defineProps({
    modelValue: [String, Number],
    type: {
        type: String,
        default: 'text',
    },
    placeholder: String,
    numericOnly: {
        type: Boolean,
        default: false,
    },
    maxNumber: {
        type: Number,
        default: null,
    },
    modelModifiers: {
        type: Object,
        default: () => ({}),
    },
});

const emit = defineEmits(['update:modelValue', 'keyup-enter']);

const updateValue = (event) => {
    let value = props.modelModifiers.trim ? event.target.value.trim() : event.target.value;

    if (props.numericOnly) {
        value = value.replace(/\D/g, '');

        if (value !== '' && props.maxNumber !== null && Number(value) > props.maxNumber) {
            value = String(props.maxNumber);
        }

        event.target.value = value;
    }

    emit('update:modelValue', value);
};
</script>

<template>
    <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        @input="updateValue"
        @keyup.enter="emit('keyup-enter')"
    />
</template>

<style scoped>
input {
    padding: 8px 12px;
    border: 1px solid var(--personal-color-border-input);
    border-radius: 4px;
    font-size: 0.9rem;
}
</style>
