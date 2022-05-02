import { assign, createMachine } from "xstate";
import { Cursor, Image, Query } from "./types";


export const makeImageStreamMachine = (query: Query) => {
  return createMachine(
    {
      id: "imageStreamMachine",
      schema: {
        events: {} as
          { type: "LOAD_MORE_IMAGES"; startIndex: number; limit: number },
        context: {} as {
          query: Query;
          cursor: Cursor | null;
          images: Image[];
          fetchQueue: number[];
        },
        services: {} as {
          fetchMoreImages: {
            data: {
              images: Image[];
              cursor: Cursor;
            }
          },
        }
      },
      tsTypes: {} as import("./imagestream.machine.typegen").Typegen0,
      initial: "active",
      context: {
        query: query,
        cursor: null,
        images: [],
        fetchQueue: [],
      },
      on: {
        LOAD_MORE_IMAGES: {
          cond: "isRequestingNewImages",
          actions: "queueFetch"
        },
      },
      states: {
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
                    "assignNewImages",
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
      }
    },
    {
      guards: {
        anyFetchQueued: (ctx, _) => ctx.fetchQueue.length > 0,
      },
      actions: {
        queueFetch: (ctx, e) => {
          console.log("queuing fetch");
          // if we already have a fetch queued, replace it with this one?
          ctx.fetchQueue.push(e.limit);
        },
        removeOldestFromQueue: (ctx, _) => {
          console.log("removing oldest from queue");
          ctx.fetchQueue.shift();
        },
        assignNewImages: assign({
          images: (ctx, e) => {
            return ctx.images.concat(e.data.images);
          },
          cursor: (_, e) => {
            return e.data.cursor;
          }
        }),
        showError: (_, e) => {
          console.error(e);
        },
      },
      services: {
        fetchMoreImages: (ctx, _) => {
          const limit = ctx.fetchQueue[0];
          const { cursor } = ctx;
          const initial = !ctx.images.length;
          console.log("fetching more images", { limit, cursor, initial });
          return ctx.query(limit, cursor, initial);
        },
      }
    }
  );
}
