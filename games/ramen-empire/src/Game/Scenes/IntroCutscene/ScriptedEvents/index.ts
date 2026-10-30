import {
  fadeTransition,
  scripted,
  sequenceOf,
  TextBoxSequence,
  type GameContext,
  type TextEntry,
} from "sliver-engine";
import { defaultSaveLabel } from "../../../Definitions/Saves";

export const runIntroCutscene = async (ctx: GameContext) => {
  const spriteLeft: TextEntry["sprite"] = {
    spritesheetName: "face:hero",
    indexes: window.definitions.sprites.faces["face:hero"].talking,
    position: "left",
    scale: 4,
    ticksPerFrame: 6,
  };

  const spriteRight: TextEntry["sprite"] = {
    ...spriteLeft,
    position: "right",
    mirroring: "horizontal",
  };

  const createEntry = (text: string, sprite?: "left" | "right"): TextEntry => {
    return {
      text,
      sprite:
        sprite === "left"
          ? spriteLeft
          : sprite === "right"
          ? spriteRight
          : undefined,
      position: "bottom",
      textSize: 24,
      lettersPerTick: 1,
    };
  };

  const textSequence = TextBoxSequence([
    createEntry("Pheww... Another long day at the office.", "left"),
    createEntry("In the beginning, there was only chaos..."),
    createEntry(
      "Our hero was struggling to find joy in this chaotic world. He hated his corporate job, and longed for something more."
    ),
    createEntry(
      "Every morning was the same: elevator music, fluorescent lights, and a calendar full of meetings that could have been a single email."
    ),
    createEntry(
      "He watched his dreams get buried under spreadsheets... and somehow the spreadsheets kept multiplying."
    ),
    createEntry(
      "By lunchtime, he'd be staring at a sad desk salad, thinking about the only warm thing in his life: instant noodles."
    ),
    createEntry("But one day, everything changed..."),
    createEntry(
      "On a rainy night, he ducked into a tiny shop hidden between two towering office buildings."
    ),
    createEntry(
      "Behind the counter, an old chef worked like a magician: simmering broth that smelled like comfort, slicing toppings with the precision of a master."
    ),
    createEntry(
      "Our hero took one sip. The steam hit his face like a memory of home he didn't know he had."
    ),
    createEntry(
      "That bowl wasn't just food—it was a plan. A quiet rebellion against the life he'd been autopiloting."
    ),
    createEntry(
      "So he began training in secret: waking before dawn, practicing knife work, learning how to listen to a simmer and hear when it needed more patience."
    ),
    createEntry(
      "At work, he still smiled in meetings... but now it was different. He had an exit strategy. And it smelled like pork bones and soy."
    ),
    createEntry(
      "One evening, he handed in his badge, shut his laptop for the last time, and stepped into the night like it was the first page of a new story."
    ),
    createEntry("I'm going to open my own ramen shop!", "left"),
    createEntry(
      "Not just any shop—one where the tired can become brave again, one bowl at a time."
    ),
  ]);

  return sequenceOf([
    textSequence,
    scripted(async (ctx, state) => {
      const existingSaves = ctx.getGame().saves.list();
      const hasDefaultSave = existingSaves.some(
        (save) => save?.label === defaultSaveLabel
      );
      if (!hasDefaultSave) {
        ctx.getGame().saves.create(
          {
            version: 1,
            introComplete: true,
          },
          { label: defaultSaveLabel }
        );
      }
      ctx.transitionToScene("restaurantScene", fadeTransition(100));
      return state;
    }),
  ]).run(ctx, {});
};
