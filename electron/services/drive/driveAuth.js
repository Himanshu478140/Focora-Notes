const { app, shell, safeStorage } = require('electron');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = require('./config');

const CREDENTIALS_PATH = path.join(app.getPath('userData'), 'drive-credentials.json');

// Memory cache for tokens to avoid decrypting on every API call
let authState = {
  accessToken: null,
  refreshToken: null,
  expiryTime: null,
  email: null
};

// Check if safeStorage is available
function getSafeStorage() {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system.');
  }
  return safeStorage;
}

// Encrypt and save tokens to drive-credentials.json
function saveCredentials(tokens) {
  const secure = getSafeStorage();
  const encryptedAccess = secure.encryptString(tokens.access_token).toString('base64');
  const encryptedRefresh = secure.encryptString(tokens.refresh_token).toString('base64');
  
  const data = {
    accessToken: encryptedAccess,
    refreshToken: encryptedRefresh,
    expiryTime: Date.now() + (tokens.expires_in * 1000),
    email: tokens.email || authState.email
  };

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(data, null, 2), 'utf8');

  // Update in-memory state
  authState.accessToken = tokens.access_token;
  authState.refreshToken = tokens.refresh_token;
  authState.expiryTime = data.expiryTime;
  authState.email = data.email;
}

// Load and decrypt credentials
function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const data = JSON.parse(raw);
    const secure = getSafeStorage();

    const accessBuffer = Buffer.from(data.accessToken, 'base64');
    const refreshBuffer = Buffer.from(data.refreshToken, 'base64');

    authState.accessToken = secure.decryptString(accessBuffer);
    authState.refreshToken = secure.decryptString(refreshBuffer);
    authState.expiryTime = data.expiryTime;
    authState.email = data.email;

    return authState;
  } catch (err) {
    console.error('focora/driveAuth: Failed to load credentials', err);
    return null;
  }
}

// Helper fetch with exponential backoff for 429 and 5xx errors
async function fetchWithRetry(url, options = {}, maxRetries = 4) {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (attempt === maxRetries) {
          return response;
        }
        const jitter = Math.random() * 200;
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

// Revoke access token and delete stored credentials
async function disconnect() {
  loadCredentials();
  
  if (authState.accessToken) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${authState.accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (err) {
      console.warn('focora/driveAuth: Failed to revoke token from Google server', err);
    }
  }

  if (fs.existsSync(CREDENTIALS_PATH)) {
    fs.unlinkSync(CREDENTIALS_PATH);
  }

  authState = {
    accessToken: null,
    refreshToken: null,
    expiryTime: null,
    email: null
  };
}

// Fetch OAuth tokens using code
async function exchangeCodeForTokens(code, redirectUri) {
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', GOOGLE_CLIENT_ID);
  params.append('client_secret', GOOGLE_CLIENT_SECRET);
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to exchange code: ${errText}`);
  }

  return res.json();
}

// Fetch user profile email
async function getUserProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error('Failed to load user profile');
  }

  const profile = await res.json();
  return profile.email;
}

// Refresh the access token
async function refreshAccessToken() {
  if (!authState.refreshToken) {
    throw new Error('No refresh token available. User must authenticate.');
  }

  const params = new URLSearchParams();
  params.append('client_id', GOOGLE_CLIENT_ID);
  params.append('client_secret', GOOGLE_CLIENT_SECRET);
  params.append('refresh_token', authState.refreshToken);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    // If the refresh token is revoked or invalid, disconnect
    if (res.status === 400) {
      await disconnect();
    }
    throw new Error(`Token refresh failed: ${errText}`);
  }

  const tokens = await res.json();
  
  // Expiry date update
  const secure = getSafeStorage();
  const encryptedAccess = secure.encryptString(tokens.access_token).toString('base64');
  
  const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const data = JSON.parse(raw);
  
  data.accessToken = encryptedAccess;
  data.expiryTime = Date.now() + (tokens.expires_in * 1000);
  
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(data, null, 2), 'utf8');

  authState.accessToken = tokens.access_token;
  authState.expiryTime = data.expiryTime;

  return authState.accessToken;
}

// Get active access token (with auto-refresh check)
async function getAccessToken() {
  loadCredentials();

  if (!authState.accessToken) {
    throw new Error('User is not authenticated.');
  }

  // Refresh token if it is expired or close to expiring (within 5 minutes)
  const bufferTime = 5 * 60 * 1000;
  if (Date.now() + bufferTime >= authState.expiryTime) {
    console.log('focora/driveAuth: Access token is expired or expiring soon, refreshing...');
    return refreshAccessToken();
  }

  return authState.accessToken;
}

// Start the Loopback OAuth Server Flow on port 0
function startOAuthFlow() {
  console.log('[focora/driveAuth] Starting Google OAuth authentication flow...');
  return new Promise((resolve, reject) => {
    let server;
    let timeoutId;
    let redirectUri = '';

    const cleanup = () => {
      console.log('[focora/driveAuth] Cleaning up local OAuth callback server...');
      if (server) {
        server.close();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    server = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      console.log(`[focora/driveAuth] HTTP request received on callback server: ${urlObj.pathname}${urlObj.search}`);

      // Ignore favicon.ico browser requests
      if (urlObj.pathname === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }

      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (code) {
        console.log('[focora/driveAuth] Authorization code received from Google callback.');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <head>
              <title>Focora Notes - Authenticated</title>
              <style>
                body { font-family: -apple-system, sans-serif; background-color: #0c0c0e; color: #fff; text-align: center; padding-top: 100px; }
                .card { background-color: #16161a; max-width: 400px; margin: 0 auto; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h1 { color: #8b5cf6; font-size: 24px; margin-bottom: 10px; }
                p { color: #9ca3af; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>Authentication Successful!</h1>
                <p>Focora Notes has been connected to your Google Drive. You can now close this tab and return to the application.</p>
              </div>
            </body>
          </html>
        `);

        try {
          console.log(`[focora/driveAuth] Exchanging authorization code for tokens (redirect_uri: ${redirectUri})...`);
          const tokens = await exchangeCodeForTokens(code, redirectUri);
          console.log('[focora/driveAuth] Tokens acquired. Fetching user profile email...');
          const email = await getUserProfile(tokens.access_token);
          tokens.email = email;
          console.log(`[focora/driveAuth] Encrypting and saving credentials for user: ${email}...`);
          saveCredentials(tokens);
          console.log('[focora/driveAuth] OAuth connection flow completed successfully!');
          cleanup();
          resolve(email);
        } catch (err) {
          console.error('[focora/driveAuth] Error exchanging code or saving credentials:', err);
          cleanup();
          reject(err);
        }
      } else {
        console.warn(`[focora/driveAuth] OAuth callback missing authorization code. Error param: ${error}`);
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 100px; background-color: #0c0c0e; color: #f87171;">
              <h2>Authentication Failed</h2>
              <p>${error || 'Missing authorization code.'}</p>
            </body>
          </html>
        `);
        cleanup();
        reject(new Error(error || 'Authorization code was not provided.'));
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      redirectUri = `http://127.0.0.1:${port}`;
      console.log(`[focora/driveAuth] Local callback server listening at ${redirectUri}`);
      
      const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
      ].join(' ');

      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      console.log(`[focora/driveAuth] Opening browser for Google authentication...`);
      shell.openExternal(oauthUrl).catch((err) => {
        console.error('[focora/driveAuth] Failed to open external browser:', err);
        cleanup();
        reject(new Error(`Failed to open browser: ${err.message}`));
      });

      // 5-minute timeout
      timeoutId = setTimeout(() => {
        console.warn('[focora/driveAuth] OAuth flow timed out (5 minutes).');
        cleanup();
        reject(new Error('Authentication process timed out. Please try again.'));
      }, 5 * 60 * 1000);
    });

    server.on('error', (err) => {
      console.error('[focora/driveAuth] Callback server error:', err);
      cleanup();
      reject(err);
    });
  });
}

module.exports = {
  startOAuthFlow,
  disconnect,
  getAccessToken,
  loadCredentials,
  fetchWithRetry
};
