import {
	GameObject,
	SquareHitbox,
	Vector,
	onKeyPressed,
	type CanvasController,
	type GameEvent,
	type Scene,
} from "sliver-engine";
import { makeIntroCutscene, type CutsceneChoice, type CutsceneState } from "./makeIntroCutscene";
import type { CutsceneActor } from "./CutsceneActor";

const TALK_RADIUS = 84;
const GATE_SIZE = new Vector(16, 68);
const GATE_OPEN_SPEED = 2.5;
const GATE_OPEN_PASSABLE_AT = 0.4;
const GATE_OPEN_ANGLE_RADIANS = -Math.PI / 2;

type ChoiceOption = {
	key: string;
	label: string;
};

type RunnerMode = "idle" | "active" | "choice" | "complete";

export class ShrineGate extends GameObject {
	private opening = false;
	private openProgress = 0;

	constructor(position: Vector) {
		super("shrine-gate", position.clone());
		this.addHitbox(
			new SquareHitbox(Vector.zero(), GATE_SIZE.clone(), this, {
				solid: true,
				debug: false,
			}),
		);
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	startOpening(): void {
		this.opening = true;
	}

	isOpen(): boolean {
		return this.openProgress >= 1;
	}

	override tick(): void {
		super.tick();
		if (!this.opening || this.isOpen()) return;

		const dt = 1 / (this.getContext()?.getTickRate() ?? 60);
		this.openProgress = Math.min(1, this.openProgress + GATE_OPEN_SPEED * dt);

		if (this.openProgress >= GATE_OPEN_PASSABLE_AT) {
			this.getHitboxes().forEach((hitbox) => {
				hitbox.solid = false;
			});
		}
	}

	override render(canvas: CanvasController, _scene: Scene): void {
		const draw = canvas.getShapeDrawer();
		const pos = this.getPosition();
		const angle = GATE_OPEN_ANGLE_RADIANS * this.openProgress;

		draw.drawRectangle(pos.x - 4, pos.y - 4, GATE_SIZE.x + 8, GATE_SIZE.y + 8, "#64748b", false);
		draw.drawRectangle(pos.x - 8, pos.y - 8, 6, GATE_SIZE.y + 16, "#475569", true);
		draw.withRotation(pos.x, pos.y, angle, () => {
			draw.drawRectangle(pos.x, pos.y, GATE_SIZE.x, GATE_SIZE.y, "#eab308", true);
			draw.drawRectangle(pos.x + 3, pos.y + 8, 10, 52, "#854d0e", false);
			draw.drawCircle(pos.x + GATE_SIZE.x - 4, pos.y + GATE_SIZE.y / 2, 2, "#f8fafc", true, false);
		});
	}
}

export class CutsceneRunner extends GameObject {
	private mode: RunnerMode = "idle";
	private status = "Walk to the elder and press E.";
	private detail = "W/A/S/D move | E talk | R restart";
	private choicePrompt: string | null = null;
	private choices: ChoiceOption[] = [];
	private selectedChoice: CutsceneChoice | null = null;
	private activeRunId = 0;

	constructor(
		private elder: CutsceneActor,
		private hero: CutsceneActor,
		private gate: ShrineGate,
	) {
		super("cutscene-runner", Vector.zero(), false, true);
		this.setPhisics({ immovable: true, affectedByGravity: false });
	}

	getStatus(): string {
		return this.status;
	}

	getDetail(): string {
		return this.detail;
	}

	getChoicePrompt(): string | null {
		return this.choicePrompt;
	}

	getChoices(): ChoiceOption[] {
		return [...this.choices];
	}

	override tick(): void {
		super.tick();

		if (this.mode !== "idle") return;

		if (this.isHeroNearElder()) {
			this.status = "The elder is ready to talk.";
			this.detail = "Press E to start the cutscene. R restarts the demo.";
			return;
		}

		this.status = "Walk to the elder and press E.";
		this.detail = "W/A/S/D move | E talk | R restart";
	}

	isHeroNearElder(): boolean {
		return this.hero.getCenter().toSubtracted(this.elder.getCenter()).magnitude() <= TALK_RADIUS;
	}

	isCutsceneActive(): boolean {
		return this.mode === "active" || this.mode === "choice";
	}

	isChoiceActive(): boolean {
		return this.mode === "choice";
	}

	isComplete(): boolean {
		return this.mode === "complete";
	}

	isRunCurrent(runId: number): boolean {
		return runId === this.activeRunId;
	}

	showChoicePrompt(runId: number, prompt: string, choices: ChoiceOption[]): void {
		if (!this.isRunCurrent(runId)) return;
		this.mode = "choice";
		this.choicePrompt = prompt;
		this.choices = choices;
		this.selectedChoice = null;
		this.status = "Make a choice.";
		this.detail = "1 accept | 2 refuse | 3 ask why";
	}

	hasSelectedChoice(runId: number): boolean {
		return this.isRunCurrent(runId) && this.selectedChoice !== null;
	}

	consumeSelectedChoice(runId: number): CutsceneChoice | null {
		if (!this.isRunCurrent(runId)) return null;
		const choice = this.selectedChoice;
		this.selectedChoice = null;
		this.choicePrompt = null;
		this.choices = [];
		this.mode = "active";
		return choice;
	}

	setScriptStatus(runId: number, status: string, detail: string): void {
		if (!this.isRunCurrent(runId)) return;
		this.status = status;
		this.detail = detail;
	}

	startGateOpening(runId: number): void {
		if (!this.isRunCurrent(runId)) return;
		this.gate.startOpening();
	}

	finishCutscene(runId: number, status: string, detail: string): void {
		if (!this.isRunCurrent(runId)) return;
		this.mode = "complete";
		this.choicePrompt = null;
		this.choices = [];
		this.selectedChoice = null;
		this.status = status;
		this.detail = detail;
		this.hero.setControlsEnabled(true);
	}

	private beginCutscene(): void {
		if (this.isCutsceneActive() || this.isComplete() || !this.isHeroNearElder()) {
			return;
		}

		this.activeRunId += 1;
		this.mode = "active";
		this.choicePrompt = null;
		this.choices = [];
		this.selectedChoice = null;
		this.status = "The elder notices you.";
		this.detail = "Space advances dialog.";
		this.hero.setControlsEnabled(false);
		this.hero.lookAt(this.elder.getCenter());
		this.elder.lookAt(this.hero.getCenter());

		const runId = this.activeRunId;
		const cutscene = makeIntroCutscene(this.elder);
		const initialState: CutsceneState = {
			elder: this.elder,
			hero: this.hero,
			runner: this,
			gate: this.gate,
			runId,
			coinsAwarded: 0,
			choice: null,
		};

		const context = this.getContext();
		if (!context) return;

		void (async () => {
			const finalState = await cutscene.run(context, initialState);
			if (!this.isRunCurrent(runId)) return;

			if (finalState.error) {
				console.error(finalState.error);
				this.mode = "idle";
				this.hero.setControlsEnabled(true);
				this.status = "Cutscene failed.";
				this.detail = "Press R to restart the demo.";
				return;
			}

			if (finalState.aborted) {
				this.mode = "idle";
				this.hero.setControlsEnabled(true);
				this.status = "Cutscene aborted.";
				this.detail = "Press E to start again or R to restart the demo.";
			}
		})();
	}

	private restartDemo(): void {
		window.location.reload();
	}

	private selectChoice(choice: CutsceneChoice): void {
		if (!this.isChoiceActive()) return;
		this.selectedChoice = choice;
	}

	@onKeyPressed<CutsceneRunner>("e", (obj) => obj.beginCutscene())
	@onKeyPressed<CutsceneRunner>("1", (obj) => obj.selectChoice("accept"))
	@onKeyPressed<CutsceneRunner>("2", (obj) => obj.selectChoice("refuse"))
	@onKeyPressed<CutsceneRunner>("3", (obj) => obj.selectChoice("ask"))
	@onKeyPressed<CutsceneRunner>("r", (obj) => obj.restartDemo())
	override handleEvent(event: GameEvent): void {
		super.handleEvent(event);
	}
}
