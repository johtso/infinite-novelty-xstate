import Navaid, { Params } from "navaid";
import { WorkerHttpvfs } from "sql.js-httpvfs";
import { assign, createMachine, EventObject, forwardTo, send } from "xstate";
import { initWorker, queries, QUERY_NAMES } from "./db";
import { flickrMachine } from "./flickr.machine";
import { Cursor, Image } from "./types";
import { assignableProduce as produce } from "./utils";

function loadTemplate(template: string): HTMLElement {
  return (document.querySelector(`#${template}`) as HTMLTemplateElement).content.firstElementChild?.cloneNode(true) as HTMLElement;
}

const rootURL = "/";
const VIEWER_MODES = QUERY_NAMES;
type ViewerMode = typeof VIEWER_MODES[number];
const defaultMode: ViewerMode = "randompopular";


type MyEvent = EventObject
  & { type: "START" }
  | { type: "RETRY_INITIALISATION" }
  | { type: "MODE_CHANGED"; mode: ViewerMode | null }
  | { type: "CURSOR_CHANGED"; mode: ViewerMode; cursor: Cursor }
  | { type: "NEED_MORE_IMAGES"; limit: number }
  | { type: "IMAGES_FETCHED", images: Image[], cursor: Cursor }
  | { type: "RESET_IMAGES" }
  | { type: "RETRY_FAILED"; retryCount: number; data: any }
  | { type: "ADD_IMAGES"; images: Image[] }
  | { type: "CLEAR_IMAGES" }
  | { type: "START_FLICKR_AUTH" }
  | { type: "TOGGLE_FAVE_IMAGE", imageId: string }
  | { type: "IMAGE_FAVE_STATE_CHANGE"; faved: boolean, imageId: string }
  | { type: "FLICKR_FAVE_TOGGLE_RESULT", imageId: string, isFaved: boolean }
  | { type: "SET_FAVE_STATE", imageId: string, faved: boolean }
  // Navigation Events
  | { type: "URL_INVALID" }
  | { type: "URL_INVALID_CURSOR" }
  | { type: "URL_NAVIGATION"; mode: ViewerMode; cursor: Cursor | null; initial?: boolean }
  | { type: "CHANGE_URL"; url: string }

function parseURLCursor(cursorString: string): Cursor {
  return JSON.parse(atob(cursorString));
}

function encodeURLCursor(cursor: Cursor): string {
  return btoa(JSON.stringify(cursor));
}

function getPhotoId(imageEl: HTMLElement): string | null {
  let style = window.getComputedStyle(imageEl);
  let bi = style.backgroundImage.slice(4, -1).replace(/"/g, "");
  return /\/(\d+)_/g.exec(bi)?.[1] || null;
}

function getImageById(images: Image[], imageId: string): Image | null {
  return images.find(i => i.id === imageId) || null;
}

const mainMachine = createMachine(
  {
    id: "mainMachine",
    schema: {
      events: {} as MyEvent,
      context: {} as {
        worker: WorkerHttpvfs | null;
        mode: ViewerMode | null;
        cursor: Cursor | null;
        images: Image[];
        fetchQueue: number[];
      },
      services: {} as {
        initWorker: {
          data: WorkerHttpvfs;
        },
        fetchMoreImages: {
          data: {
            images: Image[];
            cursor: Cursor;
          }
        },
      }
    },
    tsTypes: {} as import("./main.machine.typegen").Typegen0,
    initial: "initialisingSQLWorker",
    context: {
      worker: null,
      mode: null,
      cursor: null,
      images: [],
      fetchQueue: [],
    },
    on: {
      URL_NAVIGATION: {
        cond: "modeHasChanged",
        actions: [
          "assignNewMode",
          "clearImages",
          // "clearGallery",
        ]
      },
      URL_INVALID_CURSOR: {
        actions: "updateUrlAfterModeChange"
      },
      CHANGE_URL: {
        actions: "forwardToRouter"
      },
      NEED_MORE_IMAGES: {
        actions: "queueFetch",
      },
      START_FLICKR_AUTH: {
        actions: "startFlickrAuth",
      },
      TOGGLE_FAVE_IMAGE: {
        actions: [
          "immediatelyToggleFaveState",
          "sendFaveToggleToFlickr",
          // "toggleFaveImage",
        ]
      },
      // FLICKR_FAVE_TOGGLE_RESULT: {
      //   actions: "onFlickrFaveToggleResult",
      // }
    },
    invoke: [
      {
        id: "router",
        src: "router"
      },
      {
        id: "flickr",
        src: "flickr"
      }
    ],
    states: {
      initialisingSQLWorker: {
        tags: ["starting"],
        invoke: {
          id: "initialiseSQLWorker",
          src: "initWorker",
          onDone: {
            actions: "storeWorker",
            target: "waitingForMode"
          },
          onError: {
            target: "initFailed"
          }
        },
        on: {
          RETRY_FAILED: {
            actions: "showError",
          }
        }
      },
      waitingForMode: {
        tags: ["starting"],
        always: {
          target: "active",
          cond: (ctx, _) => Boolean(ctx.mode),
        }
      },
      active: {
        initial: "idle",
        states: {
          "idle": {
            always: {
              cond: "anyFetchQueued",
              target: "fetching",
            }
          },
          "fetching": {
            invoke: {
              src: "fetchMoreImages",
              onDone: {
                actions: [
                  "addFetchedToContext",
                  // "addImagesToGallery",
                  "removeOldestFromQueue",
                ],
                target: "cooldown",
              },
              onError: {
                target: "errored"
              }
            },
          },
          "cooldown": {
            after: {
              1000: "idle"
            }
          },
          "errored": {
            always: {
              actions: "showError",
            }
          }
        }
      },
      initFailed: {
        on: {
          RETRY_INITIALISATION: "initialisingSQLWorker"
        }
      }
    }
  },
  {
    guards: {
      anyFetchQueued: (ctx, _) => ctx.fetchQueue.length > 0,
      modeHasChanged: (ctx, e) => {
        return ctx.mode !== e.mode;
      }
    },
    actions: {
      sendFaveToggleToFlickr: send(
        (ctx, e) => {
          const image = getImageById(ctx.images, e.imageId) as Image;
          return {
            type: "TOGGLE_FAVE_IMAGE",
            imageId: e.imageId,
            faved: image.isFaved,
          };
        },
        { to: "flickr" }
      ),
      immediatelyToggleFaveState: assign(
        produce((draft, e) => {
          const image = getImageById(draft.images, e.imageId);
          if (!image) {
            console.error("Tried to toggle fave state of image that doesn't exist");
          } else {
            image.isFaved = !image.isFaved;
          }
        })
      ),
      // onFlickrFaveToggleResult: send(
      //   (_, e) => ({ type: "SET_FAVE_STATE", imageId: e.imageId, faved: e.isFaved }),
      //   { to: "gallery" }
      // ),
      startFlickrAuth: send("AUTHORISE", { to: "flickr" }),
      forwardToRouter: forwardTo("router"),
      updateUrlAfterModeChange: (ctx, _) => send(
        { type: "MODE_CHANGED", mode: ctx.mode },
        { to: "router" }
      ),
      storeWorker: assign({
        worker: (_, e) => {
          return e.data;
        }
      }),
      // clearGallery: send(
      //   { type: "CLEAR_IMAGES" }, { to: "gallery" }
      // ),
      // addImagesToGallery: send(
      //   (_, e) => ({ type: "ADD_IMAGES", images: e.data.images }),
      //   { to: "gallery" }
      // ),
      queueFetch: (ctx, e) => {
        ctx.fetchQueue.push(e.limit);
      },
      removeOldestFromQueue: (ctx, _) => {
        ctx.fetchQueue.shift();
      },
      addFetchedToContext: assign({
        images: (ctx, e) => {
          return ctx.images.concat(e.data.images);
        },
        cursor: (_, e) => {
          return e.data.cursor;
        }
      }),
      clearImages: assign({
        images: (_, __) => [],
      }),
      assignNewMode: assign({ mode: (_, e) => e.mode }),
      showError: (_, e) => {
        console.error(e);
      },
    },
    services: {
      flickr: flickrMachine,
      initWorker: initWorker,
      fetchMoreImages: (ctx, _) => {
        const limit = ctx.fetchQueue[0];
        const { mode, cursor } = ctx;
        const initial = !ctx.images.length;
        const query = queries[mode as ViewerMode];
        return query(ctx.worker as WorkerHttpvfs, limit, cursor, initial);
      },
      router: () => (sendBack, receive) => {
        const navigateToDefault = () => {
          router.route(`/${defaultMode}`);
          sendBack({ type: "URL_NAVIGATION", mode: defaultMode, cursor: null });
        }
        const router = Navaid(rootURL, navigateToDefault);

        // for each mode register the url on the router
        VIEWER_MODES.forEach((mode) => {
          router
            .on(`/${mode}/:cursor?`, (params) => {
              params = params as Params;
              var cursor: Cursor | null = null;
              try {
                cursor = params.cursor ? parseURLCursor(params.cursor) : null;
              } catch (e) {
                // If we couldn't parse the cursor just discard it
                router.route(`/${params.mode}`)
                sendBack("URL_INVALID_CURSOR");
              } finally {
                sendBack({ type: "URL_NAVIGATION", mode: mode, cursor: cursor });
              }
            });
        });

        receive((e: MyEvent) => {
          if (e.type === "MODE_CHANGED") {
            router.route(`/${e.mode}`);
          }
          if (e.type === "CURSOR_CHANGED") {
            let newPath = `/${e.mode}/${encodeURLCursor(e.cursor)}`;
            router.route(
              newPath,
              true
            );
          }
          if (e.type == "CHANGE_URL") {
            router.route(e.url);
          }
        });

        router.listen();

        // ts todo
        return () => router.unlisten?.();
      }
    }
  }
);

export default mainMachine;
