const {ipcRenderer, contextBridge} = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
  
    for (const type of ['chrome', 'node', 'electron']) {
      replaceText(`${type}-version`, process.versions[type])
    }
  })


  contextBridge.exposeInMainWorld('electron', {
    sendToMain: (channel, data) => ipcRenderer.send(channel, data), // Send data to main
    onFromMain: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)), // Listen for data from main
    resourcesPath: () => { console.log(process); return process.resourcesPath}
  });