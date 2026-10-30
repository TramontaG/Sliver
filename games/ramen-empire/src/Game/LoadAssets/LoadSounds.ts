import { SoundManager } from "sliver-engine";

const soundLibrary = new SoundManager();

const sounds = import.meta.glob<string>(
  "../Assets/Paid/Sounds/**/*.{mp3,ogg,wav}",
  { eager: true, query: "?url", import: "default" }
);

const loadSounds = async (soundLibrary: SoundManager) => {
  const names = await Promise.all(
    Object.entries(sounds).map(async ([path, url]) => {
      const fileName = path.split("/").pop() ?? path;
      const dot = fileName.lastIndexOf(".");
      const name = dot === -1 ? fileName : fileName.slice(0, dot);
      const assetUrl = new URL(url, window.location.origin);
      await soundLibrary.loadSound(name, assetUrl);
      return name;
    })
  );

  return names;
};

export { soundLibrary, loadSounds };
