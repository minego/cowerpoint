const {app, BrowserWindow} = require('electron');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
	  backgroundColor: "#888",
	  title: "cowerpoint"
  });

  mainWindow.loadURL('file://' + __dirname + '/index.html');
});
