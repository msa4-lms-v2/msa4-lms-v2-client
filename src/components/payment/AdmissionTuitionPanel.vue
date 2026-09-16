<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import myAxios from '../../api/myAxios';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatCurrency, formatDate } from '../../util/format';
import { notify } from '../../composables/useDialog';
import MyButton from '../button/MyButton.vue';
import MyDateField from '../input/MyDateField.vue';
import MyInput from '../input/MyInput.vue';
import MySelect from '../input/MySelect.vue';
const props=defineProps({ candidateId:{type:Number,required:true}, admissionYear:{type:Number,required:true}, status:{type:String,required:true}, tuitionPaid:Boolean, disabled:Boolean });
const emit=defineEmits(['refresh']);
const semesters=useSemesterStore();
const detail=ref(null),busy=ref(false),loading=ref(false),error=ref('');
const semesterId=ref(''),amount=ref(''),dueDate=ref(''),bankCode=ref('');
const reissueDueDate=ref('');
const rateLoading = ref(false);
const rateError = ref('');
let rateRequest = 0;
const today=()=>formatDate(new Date());
const bankNames={'04':'국민은행','88':'신한은행','20':'우리은행','11':'농협은행','81':'하나은행'};
const eligibleSemesters=computed(()=>semesters.semesters.filter(s=>s.academicYear===props.admissionYear));
const loadRate = async () => {
  const request = ++rateRequest;
  rateError.value = '';
  rateLoading.value = false;
  if (detail.value?.bill) {
    amount.value = detail.value.bill.billingAmount;
    return;
  }
  amount.value = '';
  if (!semesterId.value || loading.value || props.disabled || props.status !== 'PENDING' || props.tuitionPaid) return;
  rateLoading.value = true;
  try {
    const response = await myAxios.get(`/api/payment/admission-candidates/${props.candidateId}/tuition/quote`, {
      params: { semesterId: Number(semesterId.value) },
    });
    if (request === rateRequest) amount.value = response.data.data.billingAmount;
  } catch (e) {
    if (request === rateRequest) rateError.value = e.response?.data?.message || '등록금 기준 금액을 불러오지 못했습니다.';
  } finally {
    if (request === rateRequest) rateLoading.value = false;
  }
};
watch([semesterId, loading, () => props.disabled, () => props.status, () => props.tuitionPaid,
  () => detail.value?.bill], loadRate);
onUnmounted(() => { rateRequest++; });
watch(()=>props.admissionYear,()=>{if(!detail.value?.bill)semesterId.value=eligibleSemesters.value[0]?.id || '';});
const load=async({preserveError=false}={})=>{
  if(loading.value)return;
  loading.value=true;
  if(!preserveError)error.value='';
  try {
    await semesters.fetchSemesters();
    const r=await myAxios.get('/api/payment/admission-candidates/'+props.candidateId+'/tuition'); detail.value=r.data.data;
    if(detail.value?.reissuePending)reissueDueDate.value=detail.value.bill.dueDate;
    if(detail.value?.bill){semesterId.value=detail.value.bill.semesterId;amount.value=detail.value.bill.billingAmount;dueDate.value=detail.value.bill.dueDate;bankCode.value=detail.value.bankCode || detail.value.virtualAccount?.bankCode || '';}
    else if(!semesterId.value)semesterId.value=eligibleSemesters.value[0]?.id || '';
  } catch(e){error.value=e.response?.data?.message || '입학 등록금 고지를 불러오지 못했습니다.';}
  finally{loading.value=false;}
};
const issue=async()=>{
  if(busy.value || loading.value || rateLoading.value)return;
  if(props.disabled){await notify('입학 정보의 수정 사항을 먼저 저장해 주세요.');return;}
  if(props.status!=='PENDING' || props.tuitionPaid){await notify('입학 대기 상태이고 완납하지 않은 예정자만 고지를 발급할 수 있습니다.');return;}
  if(rateError.value || !Number.isSafeInteger(Number(amount.value)) || Number(amount.value)<=0){await notify(rateError.value || '등록금 기준 금액을 확인해 주세요.');return;}
  if(!semesterId.value || !dueDate.value || !bankCode.value){await notify('입학 학기, 납부 기한과 은행을 선택해 주세요.');return;}
  busy.value=true;error.value='';
  try {
    const r=await myAxios.post('/api/payment/admission-candidates/'+props.candidateId+'/tuition',{semesterId:Number(semesterId.value),dueDate:dueDate.value,bankCode:bankCode.value});
    detail.value=r.data.data; emit('refresh');
  } catch(e){error.value=e.response?.data?.message || '발급 결과를 확인하지 못했습니다. 같은 고지로 다시 요청해 주세요.';await load({preserveError:true});emit('refresh');await notify(error.value);}
  finally{busy.value=false;}
};
onMounted(load);
const reissue=async()=>{
  if(busy.value || loading.value)return;
  if(props.disabled){await notify('입학 정보의 수정 사항을 먼저 저장해 주세요.');return;}
  if(props.status!=='PENDING' || props.tuitionPaid || !detail.value?.canReissue){await notify('현재 상태에서는 가상계좌를 재발급할 수 없습니다. 납부 정보를 새로고침해 확인해 주세요.');return;}
  if(!reissueDueDate.value || (!detail.value.reissuePending && reissueDueDate.value<today())){await notify('새 납부 기한을 오늘 이후로 선택해 주세요.');return;}
  busy.value=true;error.value='';
  try{
    const r=await myAxios.post(`/api/payment/admission-candidates/${props.candidateId}/tuition/reissue`,{
      previousVirtualAccountId:detail.value.virtualAccount.id,dueDate:reissueDueDate.value,
    });
    detail.value=r.data.data;emit('refresh');
  }catch(e){
    error.value=e.response?.data?.message || '재발급 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요.';
    await load({preserveError:true});
    await notify(error.value);
  }finally{busy.value=false;}
};
</script>
<template>
  <section class="admission-tuition" aria-label="입학 등록금 가상계좌">
    <h3>입학 등록금 가상계좌</h3>
    <p v-if="disabled">변경 사항을 먼저 저장해 주세요.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="rateError" role="alert">{{ rateError }}</p>
    <dl v-if="detail?.virtualAccount">
      <dt>은행 / 계좌번호</dt><dd>{{ bankNames[detail.virtualAccount.bankCode] || detail.virtualAccount.bankCode }} / {{ detail.virtualAccount.accountNumber }}</dd>
      <dt>납부금액</dt><dd>{{ formatCurrency(detail.bill.billingAmount) }}</dd>
      <dt>입금기한</dt><dd>{{ formatDate(detail.virtualAccount.expiresAt) }}</dd>
      <dt>납부 상태</dt><dd>{{ detail.bill.status==='PAID' ? '완납 확인 중 또는 확인 완료' : detail.canReissue || detail.virtualAccount.status==='EXPIRED' ? '계좌 만료 — 이전 계좌로 납부하지 마세요.' : '납부 대기' }}</dd>
      <dt v-if="detail.syncError">처리 안내</dt><dd v-if="detail.syncError">납부·등록 연결 확인이 필요합니다. 재납부하지 말고 관리자에게 문의해 주세요.</dd>
    </dl>
    <div v-else-if="status==='PENDING' && !tuitionPaid" class="issue-fields">
      <label class="tuition-field">
        입학 학기
        <MySelect v-model="semesterId" :disabled="busy || !!detail?.bill">
          <option value="">학기 선택</option>
          <option v-for="s in eligibleSemesters" :key="s.id" :value="s.id">
            {{ semesters.getSemesterLabel(s.id) }}
          </option>
        </MySelect>
      </label>
      <label class="tuition-field">
        등록금 금액
        <MyInput
          :model-value="rateLoading ? '조회 중…' : amount !== '' ? formatCurrency(amount) : ''"
          placeholder="학기 선택 후 자동 책정"
          readonly
          :aria-busy="rateLoading"
        />
      </label>
      <div class="tuition-field">
        <label :for="`admission-due-date-${candidateId}`">납부 기한</label>
        <MyDateField
          :id="`admission-due-date-${candidateId}`"
          v-model="dueDate"
          aria-label="납부 기한"
          :disabled="busy || !!detail?.bill"
        />
      </div>
      <label class="tuition-field">
        은행
        <MySelect v-model="bankCode" :disabled="busy || !!detail?.bill">
          <option value="">은행 선택</option>
          <option value="04">국민은행</option>
          <option value="88">신한은행</option>
          <option value="20">우리은행</option>
          <option value="11">농협은행</option>
          <option value="81">하나은행</option>
        </MySelect>
      </label>
      <MyButton
        color="admin-indigo"
        size="big"
        :disabled="busy || loading || rateLoading || !!rateError || !amount || disabled"
        :content="busy ? '발급 중…' : '고지 및 가상계좌 발급'"
        @click="issue"
      />
    </div>
    <div v-if="status==='PENDING' && !tuitionPaid && detail?.canReissue" class="reissue-fields">
      <div class="reissue-actions">
        <div class="tuition-field">
          <label :for="`admission-reissue-due-date-${candidateId}`">새 납부 기한</label>
          <MyDateField
            :id="`admission-reissue-due-date-${candidateId}`"
            v-model="reissueDueDate"
            aria-label="새 납부 기한"
            :min="today()"
            :disabled="busy || loading || detail.reissuePending"
          />
        </div>
        <MyButton
          color="admin-indigo"
          size="big"
          :disabled="busy || loading"
          :content="busy ? '재발급 중…' : detail.reissuePending ? '재발급 이어서 처리' : '만료 계좌 재발급'"
          @click="reissue"
        />
      </div>
    </div>
    <div class="refresh-actions">
      <MyButton color="white" size="big" content="납부 정보 새로고침" :disabled="busy || loading" @click="load" />
    </div>
  </section>
</template>
<style scoped>
.admission-tuition {
  padding: 20px;
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
  margin: 16px 0;
  background: var(--personal-color-white);
}

.issue-fields,
.reissue-actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.tuition-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}

.refresh-actions {
  margin-top: 12px;
}

dt {
  font-weight: 600;
  margin-top: 10px;
}

dd {
  margin: 4px 0;
}
</style>
