// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  eventsCausingActions: {
    handleData: "done.invoke.retryMachine.loading:invocation[0]";
    incRetry: "";
  };
  internalEvents: {
    "done.invoke.retryMachine.loading:invocation[0]": {
      type: "done.invoke.retryMachine.loading:invocation[0]";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.retryMachine.loading:invocation[0]": {
      type: "error.platform.retryMachine.loading:invocation[0]";
      data: unknown;
    };
    "": { type: "" };
    "xstate.after(FETCH_DELAY)#retryMachine.awaitingRetry": {
      type: "xstate.after(FETCH_DELAY)#retryMachine.awaitingRetry";
    };
    "xstate.init": { type: "xstate.init" };
  };
  invokeSrcNameMap: {
    action: "done.invoke.retryMachine.loading:invocation[0]";
  };
  missingImplementations: {
    actions: "handleData";
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingServices: {
    action: "xstate.after(FETCH_DELAY)#retryMachine.awaitingRetry";
  };
  eventsCausingGuards: {
    withinLimit: "";
  };
  eventsCausingDelays: {
    FETCH_DELAY: "xstate.init";
  };
  matchesStates:
    | "loading"
    | "failed"
    | "awaitingRetry"
    | "success"
    | "terminated";
  tags: never;
}
