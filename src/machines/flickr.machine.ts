import { ActorRefFrom, assign, createMachine, Sender, spawn } from "xstate";
import { pure } from "xstate/lib/actions";
import { AuthorizationModal } from "../auth-modal";
import { Image } from "./types";
import { assignableProduce as produce, showToast } from "./utils";

type ImageId = Image["id"];

interface FaveToggleRequest {
  imageId: string;
  isFaved: boolean;
  actor: ActorRefFrom<Promise<any>>;
  controller: AbortController;
  isUndo?: boolean;
}

type FlickrMachineEvent =
  | { type: "AUTHORISE" }
  | { type: "STORAGE_HAS_AUTH_ID" }
  | { type: "TOGGLE_FAVE_IMAGE", imageId: ImageId }
  | { type: "FLICKR_FAVE_TOGGLE_RESULT", imageId: ImageId, isFaved: boolean }
  | { type: "FLICKR_FAVE_TOGGLE_FAILED", imageId: ImageId, isFaved: boolean, isUndo: boolean }
  | { type: "FLICKR_FAVE_TOGGLE_REQUEST_FINISHED", imageId: ImageId }
  | { type: "AUTH_SUCCESS" }
  | { type: "AUTH_ERROR", error: string }
  | { type: "AUTH_WINDOW_CLOSED" }
  | { type: "STORAGE_SAYS_WE_ARE_AUTHORISED" };


function windowHost(): string {
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  const port = window.location.port || 80
  const host = hostname + (Number(port) !== 80 ? `:${port}` : '')
  return new URL(protocol + '//' + host).href
}

export const flickrMachine = createMachine({
  id: "flickr",
  schema: {
    events: {} as FlickrMachineEvent,
    context: {} as {
      faveRequests: { [key: ImageId]: FaveToggleRequest };
      faveStates: { [key: ImageId]: boolean };
    },
    services: {} as {}
  },
  tsTypes: {} as import("./flickr.machine.typegen").Typegen0,
  context: {
    faveRequests: {},
    faveStates: {}
  },
  initial: "starting",
  on: {
    "*": {
      actions: (ctx, event) => {
        console.log(event);
      }
    },
    FLICKR_FAVE_TOGGLE_REQUEST_FINISHED: {
      actions: "removeFaveRequest",
    },
    FLICKR_FAVE_TOGGLE_RESULT: {
      actions: "assignFaveResult"
    },
    FLICKR_FAVE_TOGGLE_FAILED: {
      actions: [
        "assignFaveResult",
        "reportFaveFailed"
      ]
    }
  },
  invoke: {
    id: "authStateMonitor",
    src: "authStateMonitor",
  },
  states: {
    starting: {
      always: [
        {
          cond: "isStateAuthed",
          target: "authorised"
        },
        {
          target: "notAuthorised"
        }
      ]
    },
    notAuthorised: {
      on: {
        AUTHORISE: "authorising",
        STORAGE_SAYS_WE_ARE_AUTHORISED: "authorised"
      }
    },
    authorising: {
      invoke: {
        id: "authorisationFlow",
        src: "authorisationFlow",
        onError: {
          target: "notAuthorised",
          actions: "showInvokeError"
        }
      },
      on: {
        AUTH_WINDOW_CLOSED: {
          target: "notAuthorised",
          actions: () => showToast("Authorisation window closed")
        },
        AUTH_SUCCESS: {
          target: "authorised",
          actions: () => showToast("Flickr account successfully linked.")
        },
        AUTH_ERROR: {
          actions: "showError",
          target: "notAuthorised"
        }
      },
    },
    authorised: {
      entry: [
        "storeStateAuthed"
      ],
      // exit: [
      //   "storeStateNotAuthed",
      //   () => showToast("Flickr account no longer linked.")
      // ],

      on: {
        TOGGLE_FAVE_IMAGE: {
          actions: "toggleFaveImage",
        }
      }
    },
  }
},
  {
    guards: {
      isStateAuthed: () => localStorage.getItem("flickr-authorised") === "yes",
    },
    actions: {
      assignFaveResult: assign(
        produce(({ faveStates }, e) => {
          // typescript get isUndo property if it exists
          let isFaved = e.isFaved;
          // if an undo toggle failed, assume the first action never got to the server.
          if (e.type === "FLICKR_FAVE_TOGGLE_FAILED" && e.isUndo) {
            isFaved = !isFaved;
          }
          faveStates[e.imageId] = isFaved;
        })
      ),
      reportFaveFailed: (_, e) => {
        let action = e.isFaved ? "unfave" : "fave";
        showToast(`Failed to ${action} image.`);
      },
      showError: (_, e) => showToast(e.error),
      showInvokeError: (_, e) => showToast(`${e.data}`),
      removeFaveRequest: assign({
        faveRequests: (ctx, e) => {
          // copy faveRequests with the imageId removed
          const newFaveRequests = { ...ctx.faveRequests };
          delete newFaveRequests[e.imageId];
          return newFaveRequests;
        }
      }),
      toggleFaveImage: pure((ctx, e) => {
        // store spawned requests in a map in the context
        // if we already have an outstanding request toggling the same image
        // if it is toggling to the same state, don't do anything
        // if it is toggling to the opposite state, cancel the request
        // spawn a new request
        console.log("toggleFaveImage", e);
        const { imageId } = e;
        const currentFaveState = ctx.faveStates[imageId] || false;
        console.log({ currentFaveState });
        const faved = !currentFaveState;

        const outstandingRequest = ctx.faveRequests[imageId];
        let isUndo = false;
        if (outstandingRequest) {
          if (faved === outstandingRequest.isFaved) {
            console.log(`already toggling ${imageId} to the same state`);
            return;
          } else {
            console.log(`cancelling request to toggle ${imageId}'s fave state to ${outstandingRequest.isFaved}`);
            outstandingRequest.controller.abort("superseded by new request");
            isUndo = true;
          }
        }
        const { callback, controller } = makeFaveToggleRequestCallback(imageId, faved, 5000, isUndo);
        const actor = spawn(callback);
        return assign(
          produce(({ faveRequests, faveStates }, e) => {
            faveRequests[imageId] = {
              isFaved: faved,
              controller,
              actor,
              imageId
            };
            faveStates[imageId] = faved;
          }))
      }),
      storeStateAuthed: () => localStorage.setItem("flickr-authorised", "yes"),
      // storeStateNotAuthed: () => localStorage.setItem("flickr-authorised", "no"),
    },
    services: {
      authStateMonitor: (_, __) => (sendBack, _) => {
        const listener = (e: StorageEvent) => {
          if (e.key === "flickr-authorised" && e.newValue === "yes") {
            sendBack({ type: "STORAGE_SAYS_WE_ARE_AUTHORISED" });
          }
        }
        window.addEventListener("storage", listener);
        return () => {
          window.removeEventListener("storage", listener);
        }
      },
      authorisationFlow: (_, __) => (sendBack, _) => {
        const AUTH_URL = "/api/login";
        const controller = new AbortController();
        window.addEventListener("message", (e: MessageEvent) => {
          // ignore if it's from a different origin
          if (e && new URL(e.origin).origin !== new URL(window.location.href).origin) {
            return
          } else {
            if (e.data.eventType === "AUTH_RESULT") {
              const { success, error } = e.data;
              if (success) {
                sendBack({ type: "AUTH_SUCCESS" });
              } else {
                sendBack({ type: "AUTH_ERROR", error });
              }
            }
          }
        }, { signal: controller.signal });
        const modal = new AuthorizationModal(AUTH_URL);
        modal.open();

        // This is a fake event that AuthorisationModal fires by polling the popup's state
        // We don't need to clean it up as it's handled for us
        modal.addEventListener("close", () => {
          sendBack({ type: "AUTH_WINDOW_CLOSED" });
        });

        return () => controller.abort();
      }
    }
  })


function makeFaveToggleRequestCallback(
  imageId: ImageId, isFaved: boolean, timeout: number, isUndo: boolean
): {
  callback: (sendBack: Sender<FlickrMachineEvent>) => void,
  controller: AbortController,
} {
  console.log({ imageId, isFaved, timeout });
  const controller = new AbortController();
  const endpoint = isFaved ? "favorite" : "unfavorite";
  const toggleUrl = `/api/${endpoint}/${imageId}`;

  setTimeout(() => { controller.abort("timeout") }, timeout);
  const callback = async (sendBack: Sender<FlickrMachineEvent>) => {
    await fetch(toggleUrl, { signal: controller.signal, credentials: "include" })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`${resp.status}`);
        }
        resp.json()
          .then((json) => {
            if (json.stat === "ok") {
              console.log({ isFaved });
              sendBack({ type: "FLICKR_FAVE_TOGGLE_RESULT", imageId, isFaved: isFaved });
            } else if (json.stat === "fail") {
              console.log(json);
              let serverIsFaved = { '1': false, '3': true }[json.code as number];
              if (serverIsFaved === undefined) {
                throw new Error(`unexpected error code for fave toggle: ${json.code}`);
              } else {
                sendBack({ type: "FLICKR_FAVE_TOGGLE_FAILED", imageId, isFaved: serverIsFaved, isUndo });
              }
            } else {
              throw new Error(`unexpected response from fave toggle: ${JSON.stringify(json)}`);
            }
          })
          .catch((err) => {
            throw new Error(`Couldn't parse json response: ${resp.status}`);
          })
      })
      .catch((err) => {
        // check if the promise was aborted
        if (err.name === "AbortError") {
          const reason = (controller.signal as any).reason || "unknown";
          console.log(`fave toggle request for ${imageId} was aborted due to: ${reason}`);
        } else {
          console.error(`fave toggle request for ${imageId} failed with err: ${err}`);
        }
        sendBack({ type: "FLICKR_FAVE_TOGGLE_FAILED", imageId, isFaved: !isFaved, isUndo });
      })
      .finally(() => {
        sendBack({ type: "FLICKR_FAVE_TOGGLE_REQUEST_FINISHED", imageId })
      });
  }
  return { controller, callback };
}
