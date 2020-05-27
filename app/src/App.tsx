import { Music } from "@prisma/client";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import "./App.css";
import { join } from "path";

const { ipcRenderer } = window.require("electron");
const fs = window.require("fs");

const MusicList = styled.div`
  display: flex;
  flex-flow: column wrap;
  width: 70%;
`;

const Row = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-around;
`;

let selected_musics: string[] = [];
function App() {
  const [musics, setMusics] = useState<Music[]>([]);

  useEffect(() => {
    ipcRenderer.on("music-added", (event: any, musics: Music[]) => {
      setMusics(musics);
    });

    const diskinfo = ipcRenderer.sendSync("diskusage");
    console.log(diskinfo);
    const musics = ipcRenderer.sendSync("getMusics");
    setMusics(musics);
  }, []);

  function onDragStart(event: any) {
    if (selected_musics.length === 0) return;
    console.log("Drag Start");
    event.preventDefault();
    ipcRenderer.send("drag", selected_musics);
  }

  function syncMusic() {
    const path = ipcRenderer.sendSync("cwd");
    const MUSIC_FOLDER = "./app/public/musics/";
    fs.readdir(MUSIC_FOLDER, (err: any, files: string[]) => {
      if (err) return console.error(err);
      files.forEach((filename) => {
        ipcRenderer.send("addMusic", {
          name: filename.replace(".mp3", ""),
          path: join(path, MUSIC_FOLDER + filename),
          filename,
          tagName: "Rock",
          image:
            "https://img.urbania.ca/media/2018/11/df-02815_r.jpg?w=1280&h=853&fit=crop&crop=edges&fm=pjpeg&q=60&dpr=1",
        });
      });
    });
  }

  return (
    <div className="App">
      <header className="App-header">
        <h3>Kaptain Music.</h3>
        <Row>
          <button onClick={syncMusic}>Sync Music</button>
          <button
            onClick={() => {
              ipcRenderer.send("clearMusics");
              setMusics([]);
            }}
          >
            Delete Musics
          </button>
        </Row>
        <hr style={{ width: "80vw" }} />
        <MusicList>
          {musics.map((music: Music) => {
            return (
              <Row draggable onDragStart={onDragStart} key={music.id}>
                <input
                  type="checkbox"
                  onChange={(ev) =>
                    ev.target.checked
                      ? selected_musics.push(music.path)
                      : (selected_musics = selected_musics.filter(
                          (path) => path !== music.path
                        ))
                  }
                />
                <img width="20%" src={music.image} />
                <p>{music.name}</p>
                <audio controls>
                  <source src={`./musics/${music.filename}`} type="audio/mp3" />
                  Your browser does not support the audio element.
                </audio>
              </Row>
            );
          })}
        </MusicList>
      </header>
    </div>
  );
}

export default App;
