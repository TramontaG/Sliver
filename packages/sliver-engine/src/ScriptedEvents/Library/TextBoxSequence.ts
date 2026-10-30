import { scripted, sequenceOf } from "..";
import { TextBox, type TextBoxOptions } from "../../GameObject/Library/TextBox";

export type TextEntry = TextBoxOptions & {
  text: string;
};

export const DisplayTextBox = <TState extends object>(
  entry: TextEntry
) => {
  return scripted<TState>(async (ctx, state) => {
    return new Promise((resolve) => {
      const textBox = new TextBox("textBox", entry.text, entry, () =>
        resolve(state)
      );
      ctx.getSceneManager().getCurrentScene()?.addGameObject(textBox);
    });
  });
};

export const TextBoxSequence = <TState extends object>(
  entries: TextEntry[]
) => {
  return sequenceOf<TState>([
    ...entries.map((entry) => DisplayTextBox<TState>(entry)),
  ]);
};
