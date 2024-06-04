const {app, dialog, BrowserWindow, Menu, ipcMain } = require('electron');
const fs = require('fs');

let mainWindow;
let aboutWindow;
let helpWindow;
let pathFile = null;
// if(require(electron-squirrel-startup)) app.quit();


function createAboutWindow() {
   if (aboutWindow) {
     // If the window already exists, just bring it to the front
     aboutWindow.focus();
     return;
   }
 
   aboutWindow = new BrowserWindow({
     width: 500,
     height: 500,
     title: 'О приложении',
     resizable: false, // Typically, about windows are not resizable
     minimizable: false, // Often not minimizable
     webPreferences: {
       nodeIntegration: true,
       contextIsolation: true,
     },
   });
 
   aboutWindow.loadURL('file://' + __dirname + '/about.html');
 
   aboutWindow.on('closed', () => {
     aboutWindow = null; // Cleanup when the window is closed
   });
 
   aboutWindow.removeMenu();

   aboutWindow.once("ready-to-show", () => { 
    aboutWindow.show(); 
  }); 
}

function createHelpWindow() {
   if (helpWindow) {
     // If the window already exists, just bring it to the front
     helpWindow.focus();
     return;
   }
 
   helpWindow = new BrowserWindow({
     width: 500,
     height: 500,
     title: 'О приложении',
     resizable: false, // Typically, about windows are not resizable
     minimizable: false, // Often not minimizable
     webPreferences: {
       nodeIntegration: true,
       contextIsolation: true,
     },
   });
 
   helpWindow.loadURL('file://' + __dirname + '/help.html');
 
   helpWindow.on('closed', () => {
     helpWindow = null; // Cleanup when the window is closed
   });
 
   helpWindow.removeMenu();

   helpWindow.once("ready-to-show", () => { 
    helpWindow.show(); 
  }); 
 }

function setMainMenu(mainWindow){
    const template = [
        {
            label: 'Импорт данных',
    
            submenu: [
                {
                    label: 'из файла (.json)',
                    click: async () => {
                     const path = await showOpenDialog(mainWindow, ['JSON', 'json'])
                     fs.writeFileSync(process.resourcesPath + '/path/path.txt', path, "utf8", (error, data) => {
                     if (error) {
                        console.log(error);
                        return;
                     }
                     });
                     
                     app.relaunch();
                     app.quit();
                  }
                },
    
                {
                  label: 'из файла (.txt)',
                  click: async () => {
                      const path = await showOpenDialog(mainWindow, ['TXT', 'txt'])
                      fs.writeFileSync(process.resourcesPath + '/path/path.txt', path, "utf8", (error, data) => {
                      if (error) {
                         console.log(error);
                         return;
                      }
                      });
                      
                      app.relaunch();
                      app.quit();
                  }
                },

                {
                  label: 'из файла (.cvs)',
                  click: async () => {
                        const path = await showOpenDialog(mainWindow, ['CSV', 'csv'])
                        fs.writeFileSync(process.resourcesPath + '/path/path.txt', path, "utf8", (error, data) => {
                        if (error) {
                           console.log(error);
                           return;
                        }
                        });
                        
                        app.relaunch();
                        app.quit();
                  }
              }
            ]
        },
        
        {
           label: 'Окно',
           submenu: [
              {
                 label: 'Перезагружать',
                 role: 'reload'
              },
              {
                 label: 'Отладка',
                 role: 'toggledevtools'
              },
              {
                 type: 'separator'
              },
              {
                 label: 'Масштаб по умолчаню',
                 role: 'resetzoom'
              },
              {
                 label: 'Увел. масштаб',
                 role: 'zoomin'
              },
              {
                 label: 'Умень. масштаб',
                 role: 'zoomout'
              },
              {
                 type: 'separator'
              },
              {
                 label: 'Польный экран',
                 role: 'togglefullscreen'
              }
           ]
        },
        
        {
           label: 'Программа',
           role: 'window',
           submenu: [
              {
                  label: 'Уменьшить',
                  role: 'minimize'
              },
              {
                 label: 'Закрыть',
                 role: 'close'
              }
           ]
        },
        
        {
           label: 'Помощь',
           role: 'help',
           submenu: [
              {
                 label: 'Документация',
               //   click: async () => {dialog.showErrorBox('Ощибка', 'Пока документация ещё не готова. Она станет доступной в ближайшие дни.');}
               click: async () => {createHelpWindow()}
              },

              {
                  label: 'О приложении',
                  click: async () => {createAboutWindow()}
              }
           ]
        }
     ]

     return Menu.buildFromTemplate(template)
}


 
async function showOpenDialog(browserWindow, type) {
    try {
      // 'await' ensures the dialog is fully processed before returning the file path
      const result = await dialog.showOpenDialog(browserWindow, {
        properties: ['openFile'],
        filters:[ {name: type[0], extensions: [type[1]]}]
      });
  
      // If the user cancels the dialog, the filePaths array will be empty
      if (result.canceled || result.filePaths.length === 0) {
        return null; // Indicate that no file was selected
      }
  
      return result.filePaths[0]; // Return the first selected file path
    } catch (error) {
      console.error('Error showing open dialog:', error);
      throw error; // Re-throw the error to handle it outside
    }
}
// Quit when all windows are closed.
app.on('window-all-closed', function() {
  if (process.platform != 'darwin')
    app.quit();
});


// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
          width: 800, 
          height: 600, 
          frame:true, 
          transparent: false,
          webPreferences: {
            preload: __dirname + '/preload.js'
          }
  });

  

  Menu.setApplicationMenu(setMainMenu(mainWindow))

  // mainWindow.setIgnoreMouseEvents(true)

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/code.html');

  
  mainWindow.webContents.send('message-from-main', process.resourcesPath.toString());
 

   // Handle data from the renderer process
   ipcMain.on('data-from-renderer', (event, data) => {
      if(pathFile == undefined){
         console.log('Received data from renderer:', data);
         pathFile = data
      }

      // You can perform further operations or communication based on this data
   });

   // Handle data from the renderer process
   ipcMain.on('handle-error', (event, data) => {
      console.log('we are activating it ')
      dialog.showErrorBox('Ощибка', 'Файл плохо загружал. Проверьте файл или загружайте другой файл.');
   });

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
});

