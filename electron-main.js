const { app, BrowserWindow } = require('electron');
const path = require('path');

// The squirrel-startup check is removed as we are using NSIS target and did not install the module.

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple compatibility with env vars if needed
    },
    title: "ENIGAMI Dashboard",
    backgroundColor: '#121212',
    autoHideMenuBar: true // Hides the default file menu for a cleaner look
  });

  // In production (executable), load the built file.
  // In development, you might load localhost if running dev server separately,
  // but for simplicity here we assume build -> dist.
  
  // Check if we are running in dev mode via arbitrary flag or env
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the index.html from the dist folder created by Vite build
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});