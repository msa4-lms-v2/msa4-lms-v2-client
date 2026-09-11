<script setup>
import { onMounted, reactive, ref } from 'vue';
import {
  downloadSyllabusFile,
  getLectureSyllabus,
  getMyLectures,
  getSyllabusFiles,
  updateLectureSyllabus,
  uploadSyllabusFile,
} from '../../api/lectureApi';
import MyPageContainer from '../../components/layout/MyPageContainer.vue';
import MySearchFilter from '../../components/search/MySearchFilter.vue';
import MyButton from '../../components/button/MyButton.vue';
import MySelect from '../../components/input/MySelect.vue';
import MyTable from '../../components/table/MyTable.vue';
import MyStatusBadge from '../../components/common/MyStatusBadge.vue';
import PrevNextPagination from '../../components/pagination/PrevNextPagination.vue';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { confirmDialog, notify } from '../../composables/useDialog';
import { formatDate } from '../../util/format';

defineOptions({ name: 'ProfessorLectureIndex' });

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const DAY_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금' };

const columns = [
  { key: 'course', label: '교과목' },
  { key: 'semester', label: '학기' },
  { key: 'schedule', label: '요일·교시' },
  { key: 'classroom', label: '강의실' },
  { key: 'enrollment', label: '수강 인원' },
  { key: 'status', label: '상태' },
  { key: 'syllabus', label: '강의계획서' },
];

const statusLabels = { OPEN: '개설', CLOSED: '종료' };
const statusVariants = { OPEN: 'success', CLOSED: 'warning' };

const semesterStore = useSemesterStore();
const filters = reactive({ academicYear: '', term: '', status: '' });
const lectures = ref([]);
const page = ref({ page: 1, size: 20, totalCount: 0, hasNext: false });
const isLoading = ref(false);
const selectedLecture = ref(null);
const syllabus = ref('');
const syllabusFiles = ref([]);
const selectedPdf = ref(null);
const fileInput = ref(null);
const isLoadingSyllabus = ref(false);
const isSavingSyllabus = ref(false);
const isUploading = ref(false);
const downloadingFileId = ref(null);

const formatSchedule = (schedules = []) => schedules
  .map((schedule) => `${DAY_LABELS[schedule.dayOfWeek] || schedule.dayOfWeek} ${schedule.startPeriod}~${schedule.endPeriod}교시`)
  .join(', ') || '-';

const formatFileSize = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const load = async (pageNumber = 1) => {
  isLoading.value = true;
  selectedLecture.value = null;
  try {
    const response = await getMyLectures({
      academicYear: filters.academicYear || undefined,
      term: filters.term || undefined,
      status: filters.status || undefined,
      page: pageNumber,
      size: 20,
    });
    const data = response.data.data;
    lectures.value = data.items || [];
    page.value = { page: data.page, size: data.size, totalCount: data.totalCount, hasNext: data.hasNext };
  } catch (error) {
    lectures.value = [];
    page.value = { page: 1, size: 20, totalCount: 0, hasNext: false };
    await notify(error.response?.data?.message || '강의 목록을 불러오지 못했습니다.');
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => load(1);

const clearSelectedPdf = () => {
  selectedPdf.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const openSyllabus = async (lecture) => {
  selectedLecture.value = lecture;
  syllabus.value = '';
  syllabusFiles.value = [];
  clearSelectedPdf();
  isLoadingSyllabus.value = true;
  try {
    const [syllabusResponse, fileResponse] = await Promise.all([
      getLectureSyllabus(lecture.classId),
      getSyllabusFiles(lecture.classId),
    ]);
    syllabus.value = syllabusResponse.data.data.syllabus || '';
    syllabusFiles.value = fileResponse.data.data || [];
  } catch (error) {
    await notify(error.response?.data?.message || '강의계획서 정보를 불러오지 못했습니다.');
  } finally {
    isLoadingSyllabus.value = false;
  }
};

const saveSyllabus = async () => {
  if (!selectedLecture.value || isSavingSyllabus.value) return;
  if (selectedLecture.value.status !== 'OPEN') {
    await notify('종료된 강의의 강의계획서는 수정할 수 없습니다.');
    return;
  }
  const value = syllabus.value.trim();
  if (!value) {
    await notify('강의계획서 내용을 입력해 주세요.');
    return;
  }
  if (value.length > 65535) {
    await notify('강의계획서는 65,535자 이하여야 합니다.');
    return;
  }
  const confirmed = await confirmDialog('강의계획서 내용을 저장하시겠습니까?');
  if (!confirmed) return;

  isSavingSyllabus.value = true;
  try {
    const response = await updateLectureSyllabus(selectedLecture.value.classId, { syllabus: value });
    syllabus.value = response.data.data.syllabus || value;
    selectedLecture.value.syllabus = syllabus.value;
    const target = lectures.value.find((lecture) => lecture.classId === selectedLecture.value.classId);
    if (target) target.syllabus = syllabus.value;
    await notify('강의계획서가 저장되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '강의계획서를 저장하지 못했습니다.');
  } finally {
    isSavingSyllabus.value = false;
  }
};

const selectPdf = async (event) => {
  const file = event.target.files?.[0] || null;
  if (!file) {
    selectedPdf.value = null;
    return;
  }
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    clearSelectedPdf();
    await notify('PDF 파일만 업로드할 수 있습니다.');
    return;
  }
  if (file.size <= 0 || file.size > MAX_PDF_SIZE) {
    clearSelectedPdf();
    await notify('PDF 파일은 10MB 이하로 선택해 주세요.');
    return;
  }
  selectedPdf.value = file;
};

const uploadPdf = async () => {
  if (!selectedLecture.value || !selectedPdf.value || isUploading.value) return;
  if (selectedLecture.value.status !== 'OPEN') {
    await notify('종료된 강의에는 강의계획서 파일을 올릴 수 없습니다.');
    return;
  }
  isUploading.value = true;
  try {
    await uploadSyllabusFile(selectedLecture.value.classId, selectedPdf.value);
    const response = await getSyllabusFiles(selectedLecture.value.classId);
    syllabusFiles.value = response.data.data || [];
    clearSelectedPdf();
    await notify('강의계획서 PDF가 업로드되었습니다.');
  } catch (error) {
    await notify(error.response?.data?.message || '강의계획서 PDF를 업로드하지 못했습니다.');
  } finally {
    isUploading.value = false;
  }
};

const downloadPdf = async (file) => {
  if (downloadingFileId.value) return;
  downloadingFileId.value = file.fileId;
  try {
    const response = await downloadSyllabusFile(file.fileId);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.originalName || `강의계획서-${file.fileId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    await notify(error.response?.data?.message || '강의계획서 PDF를 다운로드하지 못했습니다.');
  } finally {
    downloadingFileId.value = null;
  }
};

onMounted(async () => {
  try {
    await semesterStore.fetchSemesters();
  } catch {
    // 학년도 필터 목록 조회 실패는 무시하고 강의 목록 조회로 진행한다.
  }
  await load();
});
</script>

<template>
  <MyPageContainer title="강의 조회" subtitle="담당 강의의 시간표와 수강 현황, 강의계획서를 관리합니다.">
    <MySearchFilter submit-text="조회" @search="applyFilters">
      <div class="search-group">
        <label for="lecture-year">학년도</label>
        <MySelect id="lecture-year" v-model="filters.academicYear">
          <option value="">전체</option>
          <option v-for="year in semesterStore.academicYears" :key="year" :value="year">{{ year }}학년도</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="lecture-term">학기</label>
        <MySelect id="lecture-term" v-model="filters.term">
          <option value="">전체</option>
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </MySelect>
      </div>
      <div class="search-group">
        <label for="lecture-status">상태</label>
        <MySelect id="lecture-status" v-model="filters.status">
          <option value="">전체</option>
          <option value="OPEN">개설</option>
          <option value="CLOSED">종료</option>
        </MySelect>
      </div>
    </MySearchFilter>

    <MyTable
      :columns="columns"
      :loading="isLoading"
      :empty="!isLoading && lectures.length === 0"
      empty-message="조회된 강의가 없습니다."
    >
      <tr v-for="lecture in lectures" :key="lecture.classId">
        <td>
          <div class="course-name">{{ lecture.courseName }}</div>
          <div class="course-code">{{ lecture.courseCode }} · {{ lecture.sectionNo }}분반</div>
        </td>
        <td>{{ lecture.academicYear }}학년도 {{ lecture.term === 'FIRST' ? 1 : 2 }}학기</td>
        <td>{{ formatSchedule(lecture.schedules) }}</td>
        <td>{{ lecture.classroom || '-' }}</td>
        <td>{{ lecture.currentEnrollmentCount }} / {{ lecture.capacity }}명</td>
        <td>
          <MyStatusBadge :label="statusLabels[lecture.status] || lecture.status" :variant="statusVariants[lecture.status] || 'processing'" />
        </td>
        <td>
          <MyButton
            btn-type="button"
            color="white"
            size="small"
            :content="selectedLecture?.classId === lecture.classId ? '관리 중' : '관리'"
            @click="openSyllabus(lecture)"
          />
        </td>
      </tr>
    </MyTable>

    <PrevNextPagination
      v-if="page.page > 1 || page.hasNext"
      :page="page.page"
      :has-next="page.hasNext"
      @page-change="load"
    />

    <section v-if="selectedLecture" class="syllabus-section">
      <div class="section-header">
        <div>
          <h3>{{ selectedLecture.courseName }} 강의계획서</h3>
          <p>{{ selectedLecture.courseCode }} · {{ selectedLecture.sectionNo }}분반 · {{ selectedLecture.academicYear }}학년도 {{ selectedLecture.term === 'FIRST' ? 1 : 2 }}학기</p>
        </div>
        <MyStatusBadge :label="statusLabels[selectedLecture.status] || selectedLecture.status" :variant="statusVariants[selectedLecture.status] || 'processing'" />
      </div>

      <div v-if="isLoadingSyllabus" class="detail-loading">강의계획서를 불러오는 중입니다.</div>
      <template v-else>
        <label class="syllabus-field" for="lecture-syllabus">
          <span>강의계획서 내용</span>
          <textarea
            id="lecture-syllabus"
            v-model="syllabus"
            rows="8"
            maxlength="65535"
            :disabled="selectedLecture.status !== 'OPEN'"
            placeholder="강의 목표, 교재, 평가 방법, 주차별 계획을 입력해 주세요."
          ></textarea>
        </label>
        <div class="editor-footer">
          <span>{{ syllabus.length.toLocaleString() }} / 65,535자</span>
          <MyButton
            btn-type="button"
            color="deep-blue"
            size="middle"
            :content="isSavingSyllabus ? '저장 중...' : '내용 저장'"
            :disabled="selectedLecture.status !== 'OPEN' || isSavingSyllabus"
            @click="saveSyllabus"
          />
        </div>

        <div class="file-section">
          <div class="file-upload-row">
            <div>
              <strong>강의계획서 PDF</strong>
              <p>PDF 형식, 파일당 10MB 이하</p>
            </div>
            <div class="file-actions">
              <input
                ref="fileInput"
                type="file"
                accept="application/pdf,.pdf"
                :disabled="selectedLecture.status !== 'OPEN' || isUploading"
                @change="selectPdf"
              />
              <MyButton
                btn-type="button"
                color="deep-blue"
                size="middle"
                :content="isUploading ? '업로드 중...' : 'PDF 업로드'"
                :disabled="selectedLecture.status !== 'OPEN' || !selectedPdf || isUploading"
                @click="uploadPdf"
              />
            </div>
          </div>

          <div v-if="syllabusFiles.length" class="file-list">
            <div v-for="file in syllabusFiles" :key="file.fileId" class="file-item">
              <div>
                <strong>{{ file.originalName }}</strong>
                <span>{{ formatFileSize(file.size) }} · {{ formatDate(file.createdAt, 'YYYY-MM-DD HH:mm') }}</span>
              </div>
              <MyButton
                btn-type="button"
                color="white"
                size="small"
                :content="downloadingFileId === file.fileId ? '받는 중...' : '다운로드'"
                :disabled="Boolean(downloadingFileId)"
                @click="downloadPdf(file)"
              />
            </div>
          </div>
          <p v-else class="empty-files">등록된 강의계획서 PDF가 없습니다.</p>
        </div>
      </template>
    </section>
  </MyPageContainer>
</template>

<style scoped>
.course-name {
  font-weight: 600;
}

.course-code {
  margin-top: 2px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.78rem;
}

.syllabus-section {
  margin-top: 28px;
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  background: var(--personal-color-white);
}

.section-header,
.file-upload-row,
.file-item,
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-header {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--personal-color-border-mist);
}

.section-header h3 {
  margin: 0;
  color: var(--personal-color-primary-text-navy);
  font-size: 1.05rem;
}

.section-header p,
.file-upload-row p {
  margin: 5px 0 0;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.detail-loading {
  padding: 48px 0;
  color: var(--personal-color-text-muted-slate);
  text-align: center;
}

.syllabus-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
  color: var(--personal-color-primary-text-navy);
  font-size: 0.85rem;
  font-weight: 600;
}

.syllabus-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  color: var(--personal-color-primary-text-navy);
  font: inherit;
  font-weight: 400;
  line-height: 1.55;
  resize: vertical;
}

.syllabus-field textarea:focus {
  border-color: var(--personal-color-primary-navy);
  outline: none;
}

.syllabus-field textarea:disabled {
  background: var(--personal-color-bg-subtle-snow);
  color: var(--personal-color-text-muted-slate);
}

.editor-footer {
  margin-top: 10px;
}

.editor-footer > span {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.76rem;
}

.file-section {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--personal-color-border-mist);
}

.file-upload-row strong,
.file-item strong {
  color: var(--personal-color-primary-text-navy);
  font-size: 0.86rem;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-actions input {
  max-width: 260px;
  color: var(--personal-color-text-muted-slate);
  font-size: 0.8rem;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.file-item {
  padding: 10px 12px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 4px;
  background: var(--personal-color-bg-subtle-snow);
}

.file-item > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.file-item strong {
  overflow-wrap: anywhere;
}

.file-item span,
.empty-files {
  color: var(--personal-color-text-muted-slate);
  font-size: 0.76rem;
}

.empty-files {
  margin: 16px 0 0;
}

@media (max-width: 700px) {
  .section-header,
  .file-upload-row,
  .file-item,
  .editor-footer,
  .file-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .file-actions input {
    max-width: 100%;
  }
}
</style>
