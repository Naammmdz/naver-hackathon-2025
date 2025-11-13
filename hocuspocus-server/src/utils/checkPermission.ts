import axios from 'axios';

interface PermissionResponse {
  allow: boolean;
  readOnly: boolean;
  userId?: string;
}

export async function checkPermission(
  token: string | null,
  documentName: string,
  coreServiceUrl: string
): Promise<PermissionResponse> {
  if (!token) {
    return { allow: false, readOnly: true };
  }

  try {
    const url = `${coreServiceUrl}/api/internal/check-permission`;
    const response = await axios.post(
      url,
      { documentName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (process.env.DEBUG_HOCUSPOCUS === '1') {
      console.log(`[checkPermission] POST ${url} -> ${response.status} allow=${response.data?.allow} ro=${response.data?.readOnly}`);
    }
    return response.data;
  } catch (error) {
    const status = (error as any)?.response?.status;
    const data = (error as any)?.response?.data;
    console.error(`[checkPermission] Failed: status=${status} data=${JSON.stringify(data)} url=${coreServiceUrl}`);
    return { allow: false, readOnly: true };
  }
}

