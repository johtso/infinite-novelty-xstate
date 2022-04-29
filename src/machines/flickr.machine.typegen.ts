// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  "@@xstate/typegen": true;
  eventsCausingActions: {
    removeFaveRequest: "FLICKR_FAVE_TOGGLE_REQUEST_FINISHED";
    reportFaveResult: "FLICKR_FAVE_TOGGLE_RESULT" | "FLICKR_FAVE_TOGGLE_FAILED";
    reportFaveFailed: "FLICKR_FAVE_TOGGLE_FAILED";
    showInvokeError: "error.platform.authorisationFlow";
    showError: "AUTH_ERROR";
    toggleFaveImage: "TOGGLE_FAVE_IMAGE";
    storeStateNotAuthed: "xstate.init";
    storeStateAuthed: "" | "STORAGE_SAYS_WE_ARE_AUTHORISED" | "AUTH_SUCCESS";
  };
  internalEvents: {
    "error.platform.authorisationFlow": {
      type: "error.platform.authorisationFlow";
      data: unknown;
    };
    "": { type: "" };
    "xstate.init": { type: "xstate.init" };
    "done.invoke.authStateMonitor": {
      type: "done.invoke.authStateMonitor";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
    "error.platform.authStateMonitor": {
      type: "error.platform.authStateMonitor";
      data: unknown;
    };
    "done.invoke.authorisationFlow": {
      type: "done.invoke.authorisationFlow";
      data: unknown;
      __tip: "See the XState TS docs to learn how to strongly type this.";
    };
  };
  invokeSrcNameMap: {
    authStateMonitor: "done.invoke.authStateMonitor";
    authorisationFlow: "done.invoke.authorisationFlow";
  };
  missingImplementations: {
    actions: never;
    services: never;
    guards: never;
    delays: never;
  };
  eventsCausingServices: {
    authStateMonitor: "xstate.init";
    authorisationFlow: "AUTHORISE";
  };
  eventsCausingGuards: {
    isStateAuthed: "";
  };
  eventsCausingDelays: {};
  matchesStates: "starting" | "notAuthorised" | "authorising" | "authorised";
  tags: never;
}
