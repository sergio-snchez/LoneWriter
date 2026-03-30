import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

let mainWindow;
let authServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'LoneWriter',
    // backgroundColor: '#1a1d23',
    icon: path.join(__dirname, '../dist/pwa-512x512.png'), // Fallback
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false, // Don't show the window until it's ready
  });

  // Parche para evitar el error 'Error 400: invalid_request' de Google OAuth en Electron.
  // Google bloquea los navegadores embebidos que contienen 'Electron' en el User-Agent.
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  mainWindow.webContents.setUserAgent(chromeUserAgent);

  // Asegurar que las ventanas emergentes (OAuth popup) hereden el User-Agent de Chrome
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          userAgent: chromeUserAgent
        }
      }
    };
  });

  // Solo permitir navegar a la propia app, el resto abrir en navegador externo
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide native menu
  mainWindow.setMenu(null);
}

// Servidor de Autenticación Loopback para Google OAuth (Solo Electron)
ipcMain.on('start-google-auth', (event, { clientId, scopes }) => {
  if (authServer) authServer.close();

  authServer = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    
    // Google devuelve el token en el fragmento (#), por lo que necesitamos un poco de JS en el navegador
    // para enviarlo como query param al servidor local.
    if (reqUrl.pathname === '/callback') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a1a1f; color: #fff;">
            <h2>✔ ¡Autenticación completada!</h2>
            <p>Puedes cerrar esta pestaña y volver a LoneWriter.</p>
            <script>
              const hash = window.location.hash.substring(1);
              if (hash) {
                // Enviar el fragmento al servidor de nuevo como query string
                window.location.href = '/token?' + hash;
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    if (reqUrl.pathname === '/token') {
      const accessToken = reqUrl.query.access_token;
      const expiresIn = reqUrl.query.expires_in;

      if (accessToken) {
        mainWindow.webContents.send('google-auth-success', {
          access_token: accessToken,
          expires_in: expiresIn
        });
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<html><body style="background: #1a1a1f; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh;"><h2>Listo. Puedes cerrar esta ventana.</h2></body></html>');
      
      // Cerrar el servidor local tras recibir el token
      setTimeout(() => {
        authServer.close();
        authServer = null;
      }, 1000);
    }
  }).listen(42813);

  // Abrir navegador externo
  const redirectUri = 'http://localhost:42813/callback';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scopes}`;
  shell.openExternal(authUrl);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
