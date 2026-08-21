<script setup>
import { ref } from "vue";
import { useAuthStore } from "../../store/auth/useAuthStore";
import { getMenuTitle } from "../../config/menuConfig";

const authStore = useAuthStore();

const activeMenus = ref({
  studentAcademic: false,
  studentCourse: false,
  studentGrade: false,
  studentAttendance: false,
  studentRegistration: false,
  studentScholarship: false,
  professorTeacher: false,
  professorStudent: false,
  professorCourse: false,
  professorGrade: false,
  professorAttendance: false,
});

const toggleMenu = (menuKey) => {
  activeMenus.value[menuKey] = !activeMenus.value[menuKey];
};
</script>

<template>
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <!-- 메인 화면 링크 -->
      <router-link to="/main" class="nav-item main-link">{{
        getMenuTitle("/main")
      }}</router-link>

      <!-- 학생 전용 메뉴 -->
      <template v-if="authStore.userInfo?.role === 'STUDENT'">
        <!-- 학사관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('studentAcademic')">
            <span>학사 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.studentAcademic }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.studentAcademic">
            <router-link to="/profile" class="submenu-item">{{
              getMenuTitle("/profile", "STUDENT")
            }}</router-link>
            <router-link to="/profile/info-change" class="submenu-item">{{
              getMenuTitle("/profile/info-change")
            }}</router-link>
            <router-link to="/leave-return/general" class="submenu-item">{{
              getMenuTitle("/leave-return/general")
            }}</router-link>
            <router-link to="/leave-return/military" class="submenu-item">{{
              getMenuTitle("/leave-return/military")
            }}</router-link>
          </div>
        </div>

        <!-- 수강 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('studentCourse')">
            <span>수강 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.studentCourse }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.studentCourse">
            <router-link to="/enrollments" class="submenu-item">{{
              getMenuTitle("/enrollments")
            }}</router-link>
            <router-link to="/registration" class="submenu-item">{{
              getMenuTitle("/registration")
            }}</router-link>
          </div>
        </div>

        <!-- 성적 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('studentGrade')">
            <span>성적 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.studentGrade }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.studentGrade">
            <router-link to="/grade" class="submenu-item">{{
              getMenuTitle("/grade")
            }}</router-link>
          </div>
        </div>

        <!-- 출결 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('studentAttendance')">
            <span>출결 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.studentAttendance }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.studentAttendance">
            <router-link to="/attendance" class="submenu-item">{{
              getMenuTitle("/attendance")
            }}</router-link>
            <router-link to="/excuses" class="submenu-item">{{
              getMenuTitle("/excuses")
            }}</router-link>
          </div>
        </div>

        <!-- 등록 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('studentRegistration')">
            <span>등록 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.studentRegistration }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.studentRegistration">
            <router-link to="/tuition" class="submenu-item">{{
              getMenuTitle("/tuition")
            }}</router-link>
            <router-link to="/tuition/history" class="submenu-item">{{
              getMenuTitle("/tuition/history")
            }}</router-link>
            <router-link to="/payment/health" class="submenu-item">결제 상태</router-link>
          </div>
        </div>

        <!-- 장학 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('studentScholarship')">
            <span>장학 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.studentScholarship }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.studentScholarship">
            <router-link to="/scholarships/apply" class="submenu-item">{{
              getMenuTitle("/scholarships/apply")
            }}</router-link>
            <router-link to="/scholarships/history" class="submenu-item">{{
              getMenuTitle("/scholarships/history")
            }}</router-link>
          </div>
        </div>
      </template>

      <template v-if="authStore.userInfo?.role === 'PROFESSOR'">
        <!-- 교사관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('professorTeacher')">
            <span>교사 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.professorTeacher }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.professorTeacher">
            <router-link to="/profile" class="submenu-item">{{
              getMenuTitle("/profile", "PROFESSOR")
            }}</router-link>
          </div>
        </div>

        <!-- 학생 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('professorStudent')">
            <span>학생 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.professorStudent }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.professorStudent">
            <router-link to="/professor/leave-return" class="submenu-item">{{
              getMenuTitle("/professor/leave-return")
            }}</router-link>
          </div>
        </div>

        <!-- 강의 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('professorCourse')">
            <span>강의 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.professorCourse }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.professorCourse">
            <router-link to="/professor/lectures/create" class="submenu-item">{{
              getMenuTitle("/professor/lectures/create")
            }}</router-link>
            <router-link to="/lectures" class="submenu-item">{{
              getMenuTitle("/lectures")
            }}</router-link>
          </div>
        </div>

        <!-- 성적 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('professorGrade')">
            <span>성적 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.professorGrade }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.professorGrade">
            <router-link to="/professor/grades/input" class="submenu-item">{{
              getMenuTitle("/professor/grades/input")
            }}</router-link>
            <router-link to="/professor/grades/correct" class="submenu-item">{{
              getMenuTitle("/professor/grades/correct")
            }}</router-link>
          </div>
        </div>

        <!-- 출결 관리 -->
        <div class="menu-group">
          <button type="button" class="menu-header" @click="toggleMenu('professorAttendance')">
            <span>출결 관리</span>
            <span
              class="chevron"
              :class="{ rotated: !activeMenus.professorAttendance }"
              >▼</span
            >
          </button>
          <div class="submenu-list" v-show="activeMenus.professorAttendance">
            <router-link
              to="/professor/attendance/approvals"
              class="submenu-item"
              >{{ getMenuTitle("/professor/attendance/approvals") }}</router-link
            >
            <router-link
              to="/professor/attendance"
              class="submenu-item"
              >{{ getMenuTitle("/professor/attendance") }}</router-link
            >
          </div>
        </div>
      </template>

      <template v-if="authStore.userInfo?.role === 'ADMIN'">
        <router-link to="/students" class="nav-item">{{
          getMenuTitle("/students")
        }}</router-link>
        <router-link to="/profile" class="nav-item">{{
          getMenuTitle("/profile", "ADMIN")
        }}</router-link>
        <router-link to="/admin/tuition" class="nav-item">등록금 관리</router-link>
        <router-link to="/payment/health" class="nav-item">결제 상태</router-link>
        <router-link to="/admin/info-change-requests" class="nav-item">{{
          getMenuTitle("/admin/info-change-requests")
        }}</router-link>
      </template>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  background-color: var(--personal-color-white);
  padding-top: 47px;
  height: calc(100vh - 64px);
  position: sticky;
  top: 64px;
  overflow-y: auto;
  box-sizing: border-box;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 메인 링크 */
.main-link {
  border-left: 4px solid transparent;
}

.nav-item {
  padding: 12px 24px;
  text-decoration: none;
  color: var(--personal-color-sidebar-text-slate);
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
  display: block;
}

.nav-item:hover {
  background-color: var(--personal-color-bg-hover-frost);
  color: var(--personal-color-link-blue);
}

/* 메뉴 그룹 */
.menu-group {
  display: flex;
  flex-direction: column;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 600;
  color: var(--personal-color-sidebar-text-slate);
  font-size: 0.95rem;
  font-family: inherit;
  user-select: none;
  transition: all 0.2s;
  background: none;
  border: none;
  text-align: left;
}

.menu-header:hover {
  background-color: var(--personal-color-bg-hover-frost);
  color: var(--personal-color-link-blue);
}

.chevron {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
  color: #a0aec0;
}

.chevron.rotated {
  transform: rotate(-180deg);
}

/* 서브메뉴 */
.submenu-list {
  background-color: var(--personal-color-bg-hover-frost);
  border-top: 1px solid var(--personal-color-border-mist);
  border-bottom: 1px solid var(--personal-color-border-mist);
  transition: max-height 0.3s ease;
}

.submenu-item {
  display: block;
  padding: 10px 24px 10px 38px;
  text-decoration: none;
  color: var(--personal-color-sidebar-text-muted-slate);
  font-size: 0.88rem;
  font-weight: 500;
  transition: all 0.2s;
}

.submenu-item:hover {
  background-color: var(--personal-color-border-mist);
  color: var(--personal-color-link-blue);
}

.router-link-active {
  background-color: var(--personal-color-sidebar-active-bg-sky);
  color: var(--personal-color-link-blue);
  font-weight: 600;
}

.router-link-active.main-link {
  border-left: 4px solid var(--personal-color-link-blue);
}
</style>
