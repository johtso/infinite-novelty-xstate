import Navaid, { Params } from "navaid";
import { WorkerHttpvfs } from "sql.js-httpvfs";
import { actions, assign, createMachine, forwardTo } from "xstate";
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


type MyEvent =
  | { type: "MODE_CHANGED"; mode: ViewerMode | null }
  | { type: "CURSOR_CHANGED"; mode: ViewerMode; cursor: Cursor }
  | { type: "REPORT_STREAM_CHANGED" }
  | { type: "AUTHORISE" }

  // Navigation Events
  | { type: "ROUTER.REPORT_INVALID_URL" }
  | { type: "ROUTER.REPORT_INVALID_CURSOR" }
  | { type: "ROUTER.REPORT_NAVIGATION"; route: "main"; mode: ViewerMode; cursor: Cursor | null }
  | { type: "ROUTER.REPORT_NAVIGATION"; route: "book"; bookId: string; cursor: Cursor | null }
  | { type: "ROUTER.NAVIGATE_TO_URL"; url: string }

type MyContext = {
  worker: WorkerHttpvfs | null;
  mode: ViewerMode | null;
  currentMode: ViewerMode | null;
  cursor: Cursor | null;
  bookCursor: Cursor | null;
  images: Image[];
  fetchQueue: number[];
  bookId: string | null;
  route: "main" | "book" | null;
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
      currentMode: null,
      cursor: null,
      images: [],
      fetchQueue: [],
      bookId: null,
      bookCursor: null,
      route: null,
    },
    on: {
      "*": {
        actions: (ctx, event) => {
          console.log(event);
        }
      },
      "ROUTER.REPORT_NAVIGATION": {
        actions: "assignNavigationData",
      },
      "ROUTER.NAVIGATE_TO_URL": {
        actions: "forwardToRouter"
      },
      "AUTHORISE": {
        actions: "forwardToFlickr"
      },
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
            target: "active"
          },
          onError: {
            target: "initFailed"
          }
        },
      },
      active: {
        type: "parallel",
        states: {
          mainStream: {
            initial: "inactive",
            states: {
              inactive: {
                always: {
                  cond: "routeIsMain",
                  target: "active"
                },
              },
              active: {
                entry: "assignCurrentMode",
                always: {
                  cond: "modeHasChanged",
                  target: "active"
                },
                invoke: {
                  id: "mainImageStream",
                  context: {},
                  src: (ctx, _,) => {
                    console.log("starting main image stream");
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
              }
            }
          },
          bookStream: {
            initial: "inactive",
            states: {
              inactive: {
                always: {
                  cond: "routeIsBook",
                  target: "active"
                },
              },
              active: {
                always: {
                  cond: "routeIsNotBook",
                  target: "inactive"
                },
                invoke: {
                  id: "bookImageStream",
                  src: (ctx, _,) => {
                    console.log("starting book stream");
                    if (!ctx.worker) {
                      throw new Error("Tried to start image stream but worker not initialised");
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
          }
        }
      },
      initFailed: {}
    }
  },
  {
    guards: {
      modeHasChanged: (ctx) => ctx.mode !== ctx.currentMode,
      routeIsMain: (ctx) => ctx.route === "main",
      routeIsBook: (ctx) => ctx.route === "book",
      routeIsNotBook: (ctx) => ctx.route !== "book",
      // modeHasChanged: (ctx, e) => {
      //   return ctx.mode !== e.mode;
      // },
      // bookModeHasChanged: (ctx, e) => {
      //   return ctx.bookId !== e.bookId;
      // }
    },
    actions: {
      assignCurrentMode: assign({ currentMode: (ctx) => ctx.mode }),
      assignNavigationData: assign((ctx, e) => {
        if (e.route === "main") {
          return {
            route: e.route,
            mode: e.mode,
            bookId: null,
            bookCursor: null,
            cursor: e.cursor,
          }
        } else if (e.route === "book") {
          return {
            route: e.route,
            bookId: e.bookId,
            bookCursor: e.cursor,
          }
        } else {
          throw new Error("Unknown route");
        }
      }),
      forwardToRouter: forwardTo("router"),
      forwardToFlickr: forwardTo("flickr"),
      assignWorker: assign({
        worker: (_, e) => {
          return e.data;
        }
      }),
    },
    services: {
      flickr: flickrMachine,
      initWorker: initWorker,
      router: () => (sendBack, receive) => {
        const navigateToDefault = () => {
          router.route(`/${defaultMode}`);
          sendBack({ type: "ROUTER.REPORT_NAVIGATION", route: "main", mode: defaultMode, cursor: null });
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
                sendBack("ROUTER.REPORT_INVALID_CURSOR");
              } finally {
                sendBack({ type: "ROUTER.REPORT_NAVIGATION", route: "main", mode: mode, cursor: cursor });
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
            sendBack("ROUTER.REPORT_INVALID_CURSOR");
          } finally {
            sendBack({ type: "ROUTER.REPORT_NAVIGATION", route: "book", bookId: params.bookId, cursor: cursor });
          }
        });

        receive((e: MyEvent) => {
          // if (e.type === "MODE_CHANGED") {
          //   router.route(`/${e.mode}`);
          // }
          // if (e.type === "CURSOR_CHANGED") {
          //   let newPath = `/${e.mode}/${encodeURLCursor(e.cursor)}`;
          //   router.route(
          //     newPath,
          //     true
          //   );
          // }
          if (e.type == "ROUTER.NAVIGATE_TO_URL") {
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
