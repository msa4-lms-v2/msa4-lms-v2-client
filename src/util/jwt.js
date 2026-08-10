export function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

export function isJwtExpiringSoon(token, thresholdSeconds = 60) {
  const { exp } = decodeJwtPayload(token);
  const nowSeconds = Date.now() / 1000;
  return exp - nowSeconds < thresholdSeconds;
}
