export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new Error('Invalid JWT format');
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid JWT format');
  }
  const payload = parts[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

export function isJwtExpiringSoon(token, thresholdSeconds = 60) {
  const { exp } = decodeJwtPayload(token);
  const nowSeconds = Date.now() / 1000;
  return exp - nowSeconds < thresholdSeconds;
}
