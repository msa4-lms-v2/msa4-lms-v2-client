import myAxios from './myAxios';

const ADMIN_INFO_CHANGE_URL = '/api/academic/admin/info-change-requests';

const resourcePathByRequesterType = {
  STUDENT: '/api/academic/info-change-requests',
  PROFESSOR: '/api/academic/professor-info-change-requests',
};

const requestHeaders = () => ({
  'X-Request-Id': `admin-info-change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

const resourcePath = (requesterType) => resourcePathByRequesterType[requesterType];

export const searchAdminInfoChangeRequests = (params) => myAxios.get(ADMIN_INFO_CHANGE_URL, { params });

export const getInfoChangeRequestDetail = (requesterType, requestId, config = {}) => (
  myAxios.get(`${resourcePath(requesterType)}/${requestId}`, config)
);

export const approveInfoChangeRequest = (requesterType, requestId) => (
  myAxios.patch(`${resourcePath(requesterType)}/${requestId}/approve`, null, { headers: requestHeaders() })
);

export const rejectInfoChangeRequest = (requesterType, requestId, rejectReason) => (
  myAxios.patch(
    `${resourcePath(requesterType)}/${requestId}/reject`,
    { rejectReason },
    { headers: requestHeaders() },
  )
);
