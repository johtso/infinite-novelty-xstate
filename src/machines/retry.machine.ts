import { assign, createMachine } from "xstate";
import { sendParent } from "xstate/lib/actions";


interface RetryMachineOptions {
  retryLimit: number;
  retryCoefficient: number;
  retryDelay: number;
};

function createRetryMachine(
  action: (ctx: any, evt: any) => Promise<any>,
  userOptions?: Partial<RetryMachineOptions>
) {
  const defaultOptions: RetryMachineOptions = {
    retryLimit: 5,
    retryCoefficient: 2,
    retryDelay: 500
  };
  const options = Object.assign({}, defaultOptions, userOptions);
  return (origContext: any, origEvent: any) => createMachine(
    {
      id: "retryMachine",
      tsTypes: {} as import("./retry.machine.typegen").Typegen0,
      schema: {
        context: {} as { retryCount: number },
        services: {} as {
          action: {
            data: Awaited<typeof action>;
          };
        },
      },
      meta: {
        options: options
      },
      initial: "loading",
      context: {
        retryCount: 0
      },
      states: {
        loading: {
          invoke: {
            src: "action",
            onDone: {
              target: "success",
              actions: "handleData"
            },
            onError: {
              target: "failed",
              actions: (ctx, evt) => sendParent(
                { type: "RETRY_FAILED", retryCount: ctx.retryCount, data: evt.data }
              )
            },
          }
        },
        failed: {
          always: [
            {
              target: "awaitingRetry",
              actions: "incRetry",
              cond: "withinLimit"
            },
            { target: "terminated" }
          ]
        },
        awaitingRetry: {
          after: {
            FETCH_DELAY: "loading"
          }
        },
        success: {
          type: "final",
          data: (ctx, evt) => evt.data
        },
        terminated: {
          type: "final"
        }
      }
    },
    {
      services: {
        action: () => action(origContext, origEvent),
      },
      guards: {
        withinLimit: (context) => context.retryCount < options.retryLimit
      },
      actions: {
        incRetry: assign({ retryCount: (context) => context.retryCount + 1 })
      },
      delays: {
        FETCH_DELAY: (context, event) =>
          context.retryCount * options.retryDelay * options.retryCoefficient
      }
    }
  );
}

export default createRetryMachine;