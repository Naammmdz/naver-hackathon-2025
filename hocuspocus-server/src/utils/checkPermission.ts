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
    console.warn(`[checkPermission] No token provided for document=${documentName}`);
    return { allow: false, readOnly: true };
  }

  try {
    const url = `${coreServiceUrl}/api/internal/check-permission`;
    console.log(`[checkPermission] Requesting permission:`, {
      url,
      documentName,
      tokenLength: token.length,
      tokenPreview: `${token.substring(0, 20)}...`
    });
    
    const response = await axios.post(
      url,
      { documentName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(`[checkPermission] Permission response:`, {
      status: response.status,
      allow: response.data?.allow,
      readOnly: response.data?.readOnly,
      userId: response.data?.userId
    });
    
    return response.data;
  } catch (error) {
    const status = (error as any)?.response?.status;
    const data = (error as any)?.response?.data;
    const message = (error as any)?.message;
    console.error(`[checkPermission] Failed:`, {
      status,
      message,
      data: JSON.stringify(data),
      url: coreServiceUrl,
      documentName
    });
    return { allow: false, readOnly: true };
  }
}

