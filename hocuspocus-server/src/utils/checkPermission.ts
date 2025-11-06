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
    const response = await axios.post(
      `${coreServiceUrl}/api/internal/check-permission`,
      { documentName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to check permission:', error);
    return { allow: false, readOnly: true };
  }
}

