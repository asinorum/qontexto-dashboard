let _auth0Client = null;

async function getToken() {
  if (!_auth0Client) return null;
  try {
    return await _auth0Client.getTokenSilently({
      authorizationParams: { audience: AUTH0_AUDIENCE },
    });
  } catch {
    return null;
  }
}

async function login() {
  if (!_auth0Client) return;
  await _auth0Client.loginWithRedirect({
    authorizationParams: { redirect_uri: window.location.origin },
  });
}

async function logout() {
  if (!_auth0Client) return;
  await _auth0Client.logout({
    logoutParams: { returnTo: window.location.origin },
  });
}

function _showLogin() {
  document.getElementById('login-overlay').style.display = 'flex';
}

async function _showDashboard() {
  document.getElementById('login-overlay').style.display = 'none';

  const chip = document.getElementById('user-chip');
  if (chip) chip.style.display = 'flex';

  const user = await _auth0Client.getUser();
  if (user) {
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = user.name || user.nickname || user.email || '';
  }

  startPolling();
}

async function initAuth() {
  try {
    _auth0Client = await auth0.createAuth0Client({
      domain:   AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: { audience: AUTH0_AUDIENCE },
    });

    if (location.search.includes('code=') && location.search.includes('state=')) {
      await _auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, '/');
    }

    const isAuth = await _auth0Client.isAuthenticated();
    if (isAuth) {
      await _showDashboard();
    } else {
      _showLogin();
    }
  } catch (err) {
    console.warn('[Auth] sesión inválida, limpiando caché:', err.message);
    try { await _auth0Client?.logout({ openUrl: false }); } catch {}
    _showLogin();
  }
}

initAuth();
