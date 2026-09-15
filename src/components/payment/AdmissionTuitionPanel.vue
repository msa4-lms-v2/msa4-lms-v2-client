<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import myAxios from '../../api/myAxios';
import { useSemesterStore } from '../../store/semester/useSemesterStore';
import { formatCurrency, formatDate } from '../../util/format';
import { notify } from '../../composables/useDialog';
const props=defineProps({ candidateId:{type:Number,required:true}, admissionYear:{type:Number,required:true}, status:{type:String,required:true}, tuitionPaid:Boolean, disabled:Boolean });
const emit=defineEmits(['refresh']);
const semesters=useSemesterStore();
const detail=ref(null),busy=ref(false),loading=ref(false),error=ref('');
const semesterId=ref(''),amount=ref(''),dueDate=ref(''),bankCode=ref('');
const reissueDueDate=ref('');
const today=()=>formatDate(new Date());
const bankNames={'04':'국민은행','88':'신한은행','20':'우리은행','11':'농협은행','81':'하나은행'};
const eligibleSemesters=computed(()=>semesters.semesters.filter(s=>s.academicYear===props.admissionYear));
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
  if(busy.value || loading.value)return;
  if(props.disabled){await notify('입학 정보의 수정 사항을 먼저 저장해 주세요.');return;}
  if(props.status!=='PENDING' || props.tuitionPaid){await notify('입학 대기 상태이고 완납하지 않은 예정자만 고지를 발급할 수 있습니다.');return;}
  if(!semesterId.value || !Number.isSafeInteger(Number(amount.value)) || Number(amount.value)<=0 || !dueDate.value || !bankCode.value){await notify('입학 학기, 0원보다 큰 정수 금액, 납부 기한과 은행을 입력해 주세요.');return;}
  busy.value=true;error.value='';
  try {
    const r=await myAxios.post('/api/payment/admission-candidates/'+props.candidateId+'/tuition',{semesterId:Number(semesterId.value),billingAmount:Number(amount.value),dueDate:dueDate.value,bankCode:bankCode.value});
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
    <p>등록금 완납 확인 후 계정과 학번을 자동 생성합니다. 입금 재확인에 수분이 걸릴 수 있습니다. 계좌번호·금액·기한을 입학 예정자에게 안내해 주세요.</p>
    <p v-if="tuitionPaid">완납이 확인되었습니다. 계정 생성 중 오류가 발생하면 재납부하지 말고 생성 재시도를 이용해 주세요.</p>
    <p v-if="disabled">입학 정보의 수정 사항을 먼저 저장해 주세요. 저장된 정보로 고지를 발급합니다.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <dl v-if="detail?.virtualAccount">
      <dt>은행 / 계좌번호</dt><dd>{{ bankNames[detail.virtualAccount.bankCode] || detail.virtualAccount.bankCode }} / {{ detail.virtualAccount.accountNumber }}</dd>
      <dt>납부금액</dt><dd>{{ formatCurrency(detail.bill.billingAmount) }}</dd>
      <dt>입금기한</dt><dd>{{ formatDate(detail.virtualAccount.expiresAt) }}</dd>
      <dt>납부 상태</dt><dd>{{ detail.bill.status==='PAID' ? '완납 확인 중 또는 확인 완료' : detail.canReissue || detail.virtualAccount.status==='EXPIRED' ? '계좌 만료 — 이전 계좌로 납부하지 마세요.' : '납부 대기' }}</dd>
      <dt v-if="detail.syncError">처리 안내</dt><dd v-if="detail.syncError">납부·등록 연결 확인이 필요합니다. 재납부하지 말고 관리자에게 문의해 주세요.</dd>
    </dl>
    <div v-else-if="status==='PENDING' && !tuitionPaid" class="issue-fields">
      <label>입학 학기<select v-model="semesterId" :disabled="busy || !!detail?.bill"><option value="">학기 선택</option><option v-for="s in eligibleSemesters" :key="s.id" :value="s.id">{{ semesters.getSemesterLabel(s.id) }}</option></select></label>
      <label>등록금 금액<input v-model="amount" type="number" min="1" step="1" :disabled="busy || !!detail?.bill"></label>
      <label>납부 기한<input v-model="dueDate" type="date" :disabled="busy || !!detail?.bill"></label>
      <label>은행<select v-model="bankCode" :disabled="busy || !!detail?.bill"><option value="">은행 선택</option><option value="04">국민은행</option><option value="88">신한은행</option><option value="20">우리은행</option><option value="11">농협은행</option><option value="81">하나은행</option></select></label>
      <button type="button" :disabled="busy || loading" @click="issue">{{ busy ? '발급 중…' : '고지 및 가상계좌 발급' }}</button>
    </div>
    <div v-if="status==='PENDING' && !tuitionPaid && detail?.canReissue" class="reissue-fields">
      <p>기존 고지의 금액과 은행을 유지하고 미입금 만료 계좌를 재발급합니다. 이전 계좌의 입금이 확인되면 재발급이 중단됩니다.</p>
      <p v-if="detail.reissuePending">재발급 요청이 저장되었습니다. 동일한 기한으로 이어서 처리합니다.</p>
      <label>새 납부 기한<input v-model="reissueDueDate" type="date" :min="today()" :disabled="busy || loading || detail.reissuePending"></label>
      <button type="button" :disabled="busy || loading" @click="reissue">
        {{ busy ? '재발급 중…' : detail.reissuePending ? '재발급 이어서 처리' : '만료 계좌 재발급' }}
      </button>
    </div>
    <button type="button" :disabled="busy || loading" @click="load">납부 정보 새로고침</button>
  </section>
</template>
<style scoped>
.admission-tuition{padding:20px;border:1px solid #dbe0e8;border-radius:8px;margin:16px 0;background:white}.issue-fields{display:flex;gap:12px;flex-wrap:wrap}label{display:flex;flex-direction:column;gap:6px}input,select,button{padding:8px;border:1px solid #bbb;border-radius:4px}button{margin-top:12px;cursor:pointer}button:disabled{opacity:.5;cursor:default}dt{font-weight:600;margin-top:10px}dd{margin:4px 0}
</style>
