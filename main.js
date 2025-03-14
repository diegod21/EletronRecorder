const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const Store = require("./store");

const preferences = new Store({
    configName: "userPreferences",
    defaults: {
        destination: path.join(os.homedir(), "audio")
    }
})

let destination = preferences.get("destination");

const isMac = process.platform === "darwin";
let mainWindow, preferencesWindow;

app.whenReady().then(() => {
    createMainWindow();
    createMenu();
});

function createPreferencesWindow() {
    if (preferencesWindow) {
        preferencesWindow.focus();
        return;
    }

    preferencesWindow = new BrowserWindow({
        width: 500,
        height: 150,
        backgroundColor: "#234",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    preferencesWindow.loadFile("src/preferences/index.html");

    preferencesWindow.once("ready-to-show", () => {
        preferencesWindow.webContents.send("dest-path-update", destination);
    });

    preferencesWindow.on("closed", () => {
        preferencesWindow = null;
    });

    preferencesWindow.webContents.openDevTools();
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 300,
        backgroundColor: "#234",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile("src/mainWindow/index.html");
    mainWindow.webContents.openDevTools();

    ipcMain.on("save_buffer", (event, buffer) => {
        const filePath = path.join(destination, `${Date.now()}.webm`);
        fs.writeFile(filePath, buffer, (err) => {
            if (err) {
                console.error("Erro ao salvar o arquivo:", err);
            }
        });
    });

    ipcMain.handle("showDialog", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory"]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            if (preferencesWindow) {
                preferencesWindow.webContents.send("dest-path-update", destination);
                preferences.set("destination", result.filePaths[0]);
                destination = preferences.get("destination");
            }
        }
        return destination;
    });
}

function createMenu() {
    const menuTemplate = [
        {
            label: app.name,
            submenu: [
                { label: "Preferences", click: createPreferencesWindow },
                {
                    label: "Open Destination Folder",
                    click: () => {
                        if (destination) {
                            require("electron").shell.openPath(destination);
                        }
                    }
                }
            ]
        },
        {
            label: "File",
            submenu: [isMac ? { role: "close" } : { role: "quit" }]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}
