import Navaid, { Params } from "navaid";
import { WorkerHttpvfs } from "sql.js-httpvfs";
import { actions, assign, createMachine, EventObject, forwardTo, send } from "xstate";
import { initWorker, queries, QUERY_NAMES } from "./db";
import { flickrMachine } from "./flickr.machine";
import { makeImageStreamMachine } from "./imagestream.machine";
import { Cursor, Image } from "./types";
import { apply } from "./utils";

const { choose, log } = actions;

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
  | { type: "REQUEST_IMAGE_RANGE"; startIndex: number; stopIndex: number }
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
  | { type: "URL_NAVIGATION"; mode: ViewerMode; cursor: Cursor | null }
  | { type: "ENTER_BOOK_MODE"; cursor: Cursor | null; bookId: string }
  | { type: "CHANGE_URL"; url: string }

type MyContext = {
  worker: WorkerHttpvfs | null;
  mode: ViewerMode | null;
  cursor: Cursor | null;
  images: Image[];
  fetchQueue: number[];
  bookId: string | null;
}

function parseURLCursor(cursorString: string): Cursor {
  return JSON.parse(atob(cursorString));
}

function encodeURLCursor(cursor: Cursor): string {
  return btoa(JSON.stringify(cursor));
}

const mainMachine = createMachine(
  {
    id: "mainMachine",
    schema: {
      events: {} as MyEvent,
      context: {} as MyContext,
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
      bookId: null,
    },
    on: {
      "*": {
        actions: (ctx, event) => {
          console.log(event);
        }
      },
      URL_NAVIGATION: [
        {
          actions: [
            "clearBookId",
            "assignModeIfChanged"
          ]
        }
      ],
      ENTER_BOOK_MODE: {
        cond: "bookModeHasChanged",
        actions: [
          "assignBookMode",
          // "clearImages",
        ],
      },
      URL_INVALID_CURSOR: {
        actions: "updateUrlAfterModeChange"
      },
      CHANGE_URL: {
        actions: "forwardToRouter"
      },
      // TOGGLE_FAVE_IMAGE: {
      //   actions: [
      //     "immediatelyToggleFaveState",
      //     "sendFaveToggleToFlickr",
      //     // "toggleFaveImage",
      //   ]
      // },
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
            actions: "assignWorker",
            target: "waitingForMode"
          },
          onError: {
            target: "initFailed"
          }
        },
      },
      waitingForMode: {
        tags: ["starting"],
        always: {
          target: "active",
          cond: (ctx, _) => Boolean(ctx.mode || ctx.bookId),
        }
      },
      active: {
        initial: "mainView",
        invoke: {
          id: "mainImageStream",
          src: (ctx, _,) => {
            if (!ctx.worker) {
              throw new Error("Tried to start image stream but worker not initialised");
            }
            if (!ctx.mode) {
              throw new Error("Tried to start image stream but there was no mode");
            }
            const query = queries[ctx.mode];
            const specificQuery = apply(query, ctx.worker);
            return makeImageStreamMachine(specificQuery)
          },
        },
        states: {
          mainView: {
            always: {
              cond: (ctx, _) => ctx.bookId !== null,
              target: "viewingBook"
            }
          },
          viewingBook: {
            always: {
              cond: (ctx, _) => ctx.bookId === null,
              target: "mainView"
            },
            invoke: {
              id: "bookImageStream",
              src: (ctx, _,) => {
                if (!ctx.worker) {
                  throw new Error("Tried to start image stream but worker not initialised");
                }
                if (!ctx.mode) {
                  throw new Error("Tried to start image stream but there was no mode");
                }
                if (!ctx.bookId) {
                  throw new Error("Tried to enter book view mode with no bookId in context");
                }
                const query = queries["book"];
                const specificQuery = apply(query, ctx.bookId, ctx.worker);
                return makeImageStreamMachine(specificQuery)
              },
            },
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
      modeHasChanged: (ctx, e) => {
        return ctx.mode !== e.mode;
      },
      bookModeHasChanged: (ctx, e) => {
        return ctx.bookId !== e.bookId;
      },
    },
    actions: {
      forwardToRouter: forwardTo("router"),
      updateUrlAfterModeChange: (ctx, _) => send(
        { type: "MODE_CHANGED", mode: ctx.mode },
        { to: "router" }
      ),
      assignBookMode: assign({
        bookId: (_, e) => e.bookId,
      }),
      assignWorker: assign({
        worker: (_, e) => {
          return e.data;
        }
      }),
      assignModeIfChanged: choose([
        {
          cond: "modeHasChanged",
          actions: "assignNewMode",
        }
      ]),
      assignNewMode: assign({
        mode: (_, e) => e.mode,
      }),
      clearBookId: assign({
        bookId: (_, e) => null,
      }),
      // showError: (_, e) => {
      //   console.error(e);
      // },
    },
    services: {
      flickr: flickrMachine,
      initWorker: initWorker,
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

        router.on(`/book/:bookId/:cursor?`, (params) => {
          params = params as Params;
          var cursor: Cursor | null = null;
          try {
            cursor = params.cursor ? parseURLCursor(params.cursor) : null;
          } catch (e) {
            // If we couldn't parse the cursor just discard it
            router.route(`/book/${params.bookId}`)
            sendBack("URL_INVALID_CURSOR");
          } finally {
            sendBack({ type: "ENTER_BOOK_MODE", bookId: params.bookId, cursor: cursor });
          }
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
).withConfig({ actions: {}, guards: {}, services: {} });

export default mainMachine;
