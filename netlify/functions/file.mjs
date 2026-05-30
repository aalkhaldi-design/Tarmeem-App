import { JWT } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export const handler = async (event) => {
  try {
    const id = event.queryStringParameters && event.queryStringParameters.id;
    if (!id) return { statusCode: 400, body: 'missing id' };
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return { statusCode: 500, body: 'not configured' };
    const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const jwt = new JWT({ email: sa.client_email, key: sa.private_key, scopes: [SCOPE] });
    const t = await jwt.getAccessToken();
    const token = typeof t === 'string' ? t : (t && t.token);

    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=mimeType,name&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` } });
    const meta = metaRes.ok ? await metaRes.json() : { mimeType: 'application/octet-stream' };

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { statusCode: res.status, body: 'fetch failed' };
    const buf = Buffer.from(await res.arrayBuffer());
    return {
      statusCode: 200,
      headers: { 'Content-Type': meta.mimeType || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600' },
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 500, body: (e && e.message) || 'error' };
  }
};
