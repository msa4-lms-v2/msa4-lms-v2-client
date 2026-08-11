export const loginId = (val) => {
  const regex = /^[A-Za-z0-9]{4,20}$/;

  if (!val) {
    return "아이디 확인은 필수입니다";
  }

  if (!regex.test(val)) {
    return "아이디 양식이 올바르지 않습니다.";
  }

  return "";
};

export const currentPassword = (val) => {
  if (!val) {
    return "현재 비밀번호 입력은 필수입니다.";
  }

  return "";
};

export const password = (val) => {
  const regex = /^[0-9a-zA-Z!@#$%^&*()]{8,20}$/;

  if (!val) {
    return "비밀번호는 필수입니다.";
  }

  if (!regex.test(val)) {
    return "비밀번호 양식이 올바르지 않습니다.";
  }

  return "";
};

export const newPassword = (val) => {
  const regex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,20}$/;

  if (!val) {
    return "비밀번호 입력은 필수입니다.";
  }

  if (!regex.test(val)) {
    return "비밀번호는 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.";
  }

  return "";
};

export const confirmPassword = (newPassword, confirmPassword) => {
  if (!confirmPassword) {
    return "비밀번호 확인은 필수입니다.";
  }

  return newPassword === confirmPassword
    ? ""
    : "비밀번호와 비밀번호 확인이 일치하지 않습니다.";
};
