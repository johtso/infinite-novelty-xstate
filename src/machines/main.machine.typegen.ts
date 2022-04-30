// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  eventsCausingActions: {
    assignNewMode: "URL_NAVIGATION";
    clearImages: "URL_NAVIGATION";
    updateUrlAfterModeChange: "URL_INVALID_CURSOR";
    forwardToRouter: "CHANGE_URL";
    queueFetch: "NEED_MORE_IMAGES";
    startFlickrAuth: "START_FLICKR_AUTH";
    immediatelyToggleFaveState: "TOGGLE_FAVE_IMAGE";
    sendFaveToggleToFlickr: "TOGGLE_FAVE_IMAGE";
    storeWorker: "done.invoke.initialiseSQLWorker";
    showError: "RETRY_FAILED" | "";
    addFetchedToContext: "done.invoke.mainMachine.active.fetching:invocation[0]";
    removeOldestFromQueue: "done.invoke.mainMachine.active.fetching:invocation[0]";
  };
  internalEvents: {
    "done.invoke.initialiseSQLWorker": {
      type: "done.invoke.initialiseSQLWorker";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "": { type: "" };
    "done.invoke.mainMachine.active.fetching:invocation[0]": {
      type: "done.invoke.mainMachine.active.fetching:invocation[0]";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "xstate.init": { type: "xstate.init" };
    "done.invoke.router": {
      type: "done.invoke.router";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.router": { type: "error.platform.router"; data: unknown };
    "done.invoke.flickr": {
      type: "done.invoke.flickr";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.flickr": { type: "error.platform.flickr"; data: unknown };
    "error.platform.initialiseSQLWorker": {
      type: "error.platform.initialiseSQLWorker";
      data: unknown;
    };
  };
  invokeSrcNameMap: {
    router: "done.invoke.router";
    flickr: "done.invoke.flickr";
    initWorker: "done.invoke.initialiseSQLWorker";
    fetchMoreImages: "done.invoke.mainMachine.active.fetching:invocation[0]";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingServices: {
    router: "xstate.init";
    flickr: "xstate.init";
    initWorker: "RETRY_INITIALISATION";
    fetchMoreImages: "";
  };
  eventsCausingGuards: {
    modeHasChanged: "URL_NAVIGATION";
    anyFetchQueued: "";
  };
  eventsCausingDelays: {};
  matchesStates:
    | "initialisingSQLWorker"
    | "waitingForMode"
    | "active"
    | "active.idle"
    | "active.fetching"
    | "active.cooldown"
    | "active.errored"
    | "initFailed"
    | { active?: "idle" | "fetching" | "cooldown" | "errored" };
  tags: "starting";
}
