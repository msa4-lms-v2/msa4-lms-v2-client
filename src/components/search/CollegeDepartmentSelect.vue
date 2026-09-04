<script setup>
import { computed } from 'vue';
import MySelect from '../input/MySelect.vue';

const props = defineProps({
  collegeName: { type: String, default: '' },
  departmentName: { type: String, default: '' },
  colleges: { type: Array, required: true },
});

const emit = defineEmits(['update:collegeName', 'update:departmentName', 'change']);

const localCollege = computed({
  get: () => props.collegeName,
  set: (val) => emit('update:collegeName', val),
});

const localDepartment = computed({
  get: () => props.departmentName,
  set: (val) => emit('update:departmentName', val),
});

const filteredDepartments = computed(() => {
  if (!localCollege.value) {
    const allDepartments = [];
    props.colleges.forEach((college) => {
      if (college.departments) {
        allDepartments.push(...college.departments);
      }
    });
    return Array.from(new Map(allDepartments.map((department) => [department.name, department])).values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }

  const matchedCollege = props.colleges.find((college) => college.name === localCollege.value);
  return matchedCollege ? matchedCollege.departments || [] : [];
});

const onCollegeChange = () => {
  if (localCollege.value) {
    const matchedCollege = props.colleges.find((college) => college.name === localCollege.value);
    const departmentNames = matchedCollege ? (matchedCollege.departments || []).map((d) => d.name) : [];
    if (!departmentNames.includes(localDepartment.value)) {
      localDepartment.value = '';
    }
  } else {
    localDepartment.value = '';
  }
  emit('change');
};

const onDepartmentChange = () => {
  emit('change');
};
</script>

<template>
  <div class="search-group">
    <label>단과대</label>
    <MySelect v-model="localCollege" @change="onCollegeChange">
      <option value="">전체</option>
      <option v-for="college in colleges" :key="college.id" :value="college.name">
        {{ college.name }}
      </option>
    </MySelect>
  </div>
  <div class="search-group">
    <label>학과</label>
    <MySelect v-model="localDepartment" @change="onDepartmentChange">
      <option value="">전체</option>
      <option v-for="department in filteredDepartments" :key="department.id" :value="department.name">
        {{ department.name }}
      </option>
    </MySelect>
  </div>
</template>
