import { importPKCS8, SignJWT } from 'jose';

// Helper to get Google OAuth2 Access Token using Service Account
async function getAccessToken(clientEmail, privateKey) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const scope = 'https://www.googleapis.com/auth/firebase.messaging';

  const privateKeyEnv = privateKey.replace(/\\n/g, '\n');
  const importedKey = await importPKCS8(privateKeyEnv, 'RS256');

  const jwt = await new SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: tokenUrl,
    scope: scope,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(importedKey);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${data.error_description || JSON.stringify(data)}`);
  }
  return data.access_token;
}

// Helper to send FCM Notification
async function sendFCMNotification(env, token, title, body) {
  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase credentials in environment variables.");
  }

  const accessToken = await getAccessToken(clientEmail, privateKey);

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const message = {
    message: {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'emergency_alarms',
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default'
          }
        }
      }
    }
  };

  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  return response.ok;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ---------------------------------------------------------
    // Route: POST /register
    // App hits this to store its FCM token
    // ---------------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/register') {
      try {
        const { token } = await request.json();
        if (!token) return new Response("Missing token", { status: 400 });

        // Store token in KV. We prefix with 'token:' to easily list them later.
        await env.FCM_TOKENS.put(`token:${token}`, Date.now().toString());
        
        // Setup CORS
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(e.message, { status: 500 });
      }
    }

    // ---------------------------------------------------------
    // Route: GET or POST /webhook
    // Shelly or LinkTap hits this when an event occurs
    // ---------------------------------------------------------
    if (url.pathname === '/webhook') {
      try {
        // You can customize title/body based on query params or JSON body
        let title = "🚨 Water Detected!";
        let body = "A sensor has detected water. Please check your dashboard.";

        // Grab all registered tokens
        const listResult = await env.FCM_TOKENS.list({ prefix: 'token:' });
        const tokens = listResult.keys.map(k => k.name.replace('token:', ''));

        if (tokens.length === 0) {
          return new Response("No devices registered for notifications.", { status: 200 });
        }

        // Send push to all tokens concurrently
        const pushPromises = tokens.map(token => 
          sendFCMNotification(env, token, title, body)
            .catch(err => console.error(`Failed to send to ${token}:`, err))
        );

        await Promise.all(pushPromises);

        return new Response("Notifications sent", { status: 200 });
      } catch (e) {
        return new Response(e.message, { status: 500 });
      }
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    return new Response("Boat-RV-Guardian Notification Worker", { status: 200 });
  }
};
