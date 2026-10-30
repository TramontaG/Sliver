import type { GameContext } from "../Context";
export * from "./Combinators";
export * from "./Library";

export type BaseTState =
  | ErroredTState
  | AbortedTState
  | SuccessTState
  | ActiveTState;

export type ErroredTState = {
  done: true;
  aborted: undefined;
  error: Error;
};

export type AbortedTState = {
  done: true;
  aborted: string;
  error: undefined;
};

export type ActiveTState = {
  done: false;
  aborted: undefined;
  error: undefined;
};

export type SuccessTState = {
  done: true;
  aborted: undefined;
  error: undefined;
};

export type ScriptState<TState extends object> = BaseTState & TState;
export type ScriptInputState<TState extends object> =
  & TState
  & Partial<BaseTState>;

export type ScriptEvent<TState extends object> = {
  /**For debugging purposes */
  label?: string;

  /**Executes the script event and returns a new copy of the result state */
  run(ctx: GameContext, state: ScriptInputState<TState>): Promise<ScriptState<TState>>;
  abort: (reason: string) => void;
};

export const scripted = <TState extends object>(
  cb: (
    ctx: GameContext,
    state: ScriptState<TState>
  ) => Promise<ScriptState<TState>>,
  label: string | null = null
): ScriptEvent<TState> => {
  // This is the state that will be passed to the script event
  const scriptState: ActiveTState = {
    done: false,
    aborted: undefined,
    error: undefined,
  };

  return {
    label: label ?? undefined,
    run: (ctx: GameContext, state: ScriptInputState<TState>) => {
      const newState = {
        ...scriptState,
        ...state,
      };

      return cb(ctx, newState as ScriptState<TState>);
    },
    abort: (reason: string) => abort(scriptState, reason),
  };
};

export const done = <TState extends BaseTState>(
  state: TState
): TState & SuccessTState => ({
  ...state,
  done: true,
  aborted: undefined,
  error: undefined,
});

export const abort = <TState extends BaseTState>(
  state: TState,
  reason: string
): TState & AbortedTState => ({
  ...state,
  aborted: reason,
  error: undefined,
  done: true,
});

export const failed = <TState extends BaseTState>(
  state: TState,
  error: string
): TState & ErroredTState => ({
  ...state,
  aborted: undefined,
  error: new Error(error),
  done: true,
});

export const isAborted = <TState extends BaseTState>(
  state: TState
): state is TState & AbortedTState => {
  return state.aborted !== undefined;
};

export const isErrored = <TState extends BaseTState>(
  state: TState
): state is TState & ErroredTState => {
  return state.error !== undefined;
};

export const isDone = <TState extends BaseTState>(state: TState) => {
  return state.done;
};

export const runEvent = async <TState extends object>(
  event: ScriptEvent<TState>,
  ctx: GameContext,
  state: ScriptState<TState>
) => {
  if (isDone(state)) {
    return state;
  }

  if (isAborted(state)) {
    return abort(state, `Sequence Aborted: ` + state.aborted);
  }

  if (isErrored(state)) {
    return failed(state, `Sequence Failed: ` + state.error);
  }

  return event.run(ctx, state);
};
