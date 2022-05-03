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
          fetchQueue: { start: number, limit: number }[];
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
        fetchQueue: [{ start: 0, limit: 20 }],
      },
      on: {
        LOAD_MORE_IMAGES: {
          actions: "queueFetch"
        },
      },
      states: {
        active: {
          initial: "idle",
          entry: (ctx) => { console.log("image stream started", query) },
          states: {
            "idle": {
              always: {
                cond: "anyFetchQueued",
                target: "fetching"
              },
              on: {
                LOAD_MORE_IMAGES: {
                  cond: "anyFetchQueued",
                  target: "fetching"
                }
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
          const last = ctx.fetchQueue[ctx.fetchQueue.length - 1];
          const currentIndex = (last?.start + last?.limit) || ctx.images.length;
          let startIndex = e.startIndex;
          let limit = e.limit;
          if (startIndex < currentIndex) {
            limit -= currentIndex - startIndex;
            startIndex = currentIndex;
          }
          if (limit) {
            console.log("queuing fetch", { startIndex, limit });
            ctx.fetchQueue.push({ start: startIndex, limit: limit });
          } else {
            console.log("ignoring fetch request, already satisfied");
          }
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
          const { start, limit } = ctx.fetchQueue[0];
          // const currentIndex = ctx.images.length;
          // const realLimit = limit - (currentIndex - start);
          const initial = !ctx.images.length;
          // if (!realLimit) {
          //   console.log("repeated request for images already fetched, doing nothing");
          //   return new Promise
          // } else {
          console.log("fetching more images", { limit, cursor: ctx.cursor, initial });
          return ctx.query(limit, ctx.cursor, initial);
          // }
        },
      }
    }
  ).withConfig({ actions: {}, guards: {}, services: {} });
}
