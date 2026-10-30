import * as _sprites from "./LoadSprites";
import * as _sounds from "./LoadSounds";

export const loadEverything = async () => {
  const [sprites, sounds] = await Promise.all([
    _sprites.loadSprites(_sprites.spriteLibrary),
    _sounds.loadSounds(_sounds.soundLibrary),
  ]);

  return {
    sprites,
    sounds,
  };
};
