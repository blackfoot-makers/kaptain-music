import { app, BrowserWindow } from "electron";
import { join } from "path";
import { PrismaClient, Music } from "@prisma/client";
import { ipcMain } from "electron";
import { platform } from "os";

const checkDiskSpace = require("check-disk-space");
const prisma = new PrismaClient();

ipcMain.setMaxListeners(0);

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (process.env.NODE_ENV === "development")
    win.loadURL("http://localhost:3000/");
  else
    win
      .loadURL(`file://${join(__dirname, "../app/build/index.html")}`)
      .catch((err) => console.error(err));

  win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  prisma.disconnect();
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("diskusage", async (event) => {
  let path = platform() === "win32" ? "C:/" : "/";
  event.returnValue = await checkDiskSpace(path);
});

ipcMain.on("getMusics", async (event) => {
  const allMusics = await prisma.music.findMany();
  event.returnValue = allMusics;
});

ipcMain.on(
  "addMusic",
  async (event, { name, path, tagName, image, filename }) => {
    console.log("Music added", name);
    const tag = await prisma.tag.create({
      data: {
        name: tagName,
      },
    });
    const music = await prisma.music.create({
      data: {
        author: "toto",
        name,
        tags: {
          connect: { id: tag.id },
        },
        path,
        filename,
        image,
      },
    });
    const allMusics = await prisma.music.findMany();
    event.reply("music-added", allMusics);
  }
);

ipcMain.on("clearMusics", async (event) => {
  const count = await prisma.music.deleteMany({
    where: {
      NOT: {
        id: -1,
      },
    },
  });
  console.log("Musics cleared:", count);
  event.returnValue = "done";
});

ipcMain.on("cwd", (event) => {
  event.returnValue = process.cwd();
});

ipcMain.on("drag", (event, filesPath) => {
  // const filesAbsolutePath: string[] = [];
  // filesPath.forEach((path: string) => {
  //   filesAbsolutePath.push(join(__dirname, path));
  // });
  event.sender.startDrag({
    // @ts-ignore: Undocumented
    files: filesPath,
    icon: join(__dirname, "../musicicon.png"),
  });
});
