import {
	type GameObject,
	type Walker,
} from "sliver-engine";
import { Character } from "./Character";

type WalkerFactory = (character: GameObject) => Walker;

export const createCharacterBase = (walkerFactory: WalkerFactory): Character => {
	const character = new Character();
	character.setWalker(walkerFactory(character));
	return character;
};
