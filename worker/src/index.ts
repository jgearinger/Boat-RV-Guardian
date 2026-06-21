import { SignJWT, importPKCS8 } from 'jose';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

/**
 * Generates a Google OAuth2 Access Token using the Firebase Service Account Private Key.
 */
async function getFirebaseAccessToken(env: Env): Promise<string> {
  const privateKeyStr = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const privateKey = await importPKCS8(privateKeyStr, 'RS256');

  const jwt = await new SignJWT({
    iss: env.FIREBASE_CLIENT_EMAIL,
    sub: env.FIREBASE_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/datastore'
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to get OAuth token: ${await res.text()}`);
  }

  const data: any = await res.json();
  return data.access_token;
}

/**
 * Retrieves the user's LinkTap API config from Firestore.
 */
async function getLinkTapConfigFromFirestore(env: Env, token: string, uid: string): Promise<any> {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Firestore doc: ${await res.text()}`);
  }

  const data: any = await res.json();
  
  if (!data.fields || !data.fields.linktap || !data.fields.linktap.mapValue) {
    throw new Error('LinkTap configuration not found in Firestore for this user.');
  }

  const linktapObj = data.fields.linktap.mapValue.fields;
  return {
    username: linktapObj.username?.stringValue || '',
    apiKey: linktapObj.apiKey?.stringValue || '',
    gatewayId: linktapObj.gatewayId?.stringValue || '',
    taplinkerId: linktapObj.taplinkerId?.stringValue || ''
  };
}

/**
 * Triggers the LinkTap Cloud API to instantly shut off the water.
 */
async function triggerLinkTapShutoff(config: any): Promise<void> {
  const payload = {
    username: config.username,
    apiKey: config.apiKey,
    gatewayId: config.gatewayId,
    taplinkerId: config.taplinkerId,
    action: false,
    autoBack: true
  };

  const res = await fetch('https://www.link-tap.com/api/turnOffV2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`LinkTap API failure: ${await res.text()}`);
  }

  const data: any = await res.json();
  if (data.result === 'error') {
    throw new Error(`LinkTap API error: ${data.message}`);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const url = new URL(request.url);
      const uid = url.searchParams.get('uid');
      if (!uid) {
        return new Response('Missing uid parameter', { status: 400 });
      }

      console.log(`Processing webhook for uid: ${uid}`);

      // 1. Get Google OAuth Access Token
      const accessToken = await getFirebaseAccessToken(env);

      // 2. Fetch LinkTap Config from Firestore
      const linktapConfig = await getLinkTapConfigFromFirestore(env, accessToken, uid);

      if (!linktapConfig.username || !linktapConfig.apiKey || !linktapConfig.gatewayId || !linktapConfig.taplinkerId) {
        return new Response('Incomplete LinkTap config in Firestore', { status: 400 });
      }

      // 3. Trigger Water Shutoff via LinkTap
      await triggerLinkTapShutoff(linktapConfig);

      console.log(`Successfully triggered water shutoff for uid: ${uid}`);

      return new Response(JSON.stringify({ status: 'success', action: 'linktap_shutoff' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (e: any) {
      console.error('Webhook error:', e);
      return new Response(`Bad Request: ${e.message}`, { status: 400 });
    }
  },
};
