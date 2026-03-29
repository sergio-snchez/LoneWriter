import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
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

  win.once('ready-to-show', () => {
    win.show();
  });

  // Load the app
  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Hide native menu
  win.setMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
