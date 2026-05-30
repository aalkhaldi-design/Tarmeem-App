import { JWT } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/drive';

async function getToken() {
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const jwt = new JWT({ email: sa.client_email, key: sa.private_key, scopes: [SCOPE] });
  const t = await jwt.getAccessToken();
  return typeof t === 'string' ? t : (t && t.token);
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.DRIVE_FOLDER_ID)
      return { statusCode: 500, body: JSON.stringify({ error: 'الرفع غير مُهيّأ — راجع إعدادات Google Drive في Netlify.' }) };

    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    const { fileName, mimeType, dataBase64 } = JSON.parse(raw || '{}');
    if (!fileName || !dataBase64) return { statusCode: 400, body: JSON.stringify({ error: 'ملف غير صالح' }) };

    const token = await getToken();
    if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'تعذّر المصادقة مع Google' }) };

    const fileBuffer = Buffer.from(dataBase64, 'base64');
    const boundary = 'tarmeem_' + Date.now();
    const metadata = { name: fileName, parents: [process.env.DRIVE_FOLDER_ID] };
    const pre = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
    );
    const post = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([pre, fileBuffer, post]);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType',
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
    );
    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: 'فشل الرفع إلى Drive', detail: await res.text() }) };
    const file = await res.json();
    return { statusCode: 200, body: JSON.stringify({ driveId: file.id, name: file.name, mimeType: file.mimeType }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: (e && e.message) || 'خطأ في الرفع' }) };
  }
};
