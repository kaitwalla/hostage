const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
var hostile = require('hostile')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let connection_info

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({frame: false, width: 800, height: 600,  minHeight: 400,
  minWidth: 300 })

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  //win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// Function for handling errors back to the renderer process
function return_error(errMsg) {
  console.log(errMsg);
  //event.sender.send('error',errorMsg);
  return false;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)


ipcMain.on('disable_host', function(event,arg) {
  hostile.remove(connection_info.host, arg.URL, function (err) {
  if (err) {
    return_error(err);
  } else {
    event.sender.send('host_disabled',arg.slug);
  }
});

ipcMain.on('enable_host', function(event,arg) {
  hostile.set(connection_info.host, arg.URL, function (err) {
    if (err) {
      return_error(err);
    } else {
      event.sender.send('host_enabled',arg.slug);
    }
});

ipcMain.on('remove_host',function(event,arg) {

});

ipcMain.on('update_host', function(event,arg) {

});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})