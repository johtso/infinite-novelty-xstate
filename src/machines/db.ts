import { createDbWorker, WorkerHttpvfs } from "sql.js-httpvfs";
import sqlWASMURL from "sql.js-httpvfs/dist/sql-wasm.wasm?url";
import sqliteWorkerURL from "sql.js-httpvfs/dist/sqlite.worker.js?url";
import { query } from 'sqliterally';
import { Cursor, Image } from "./types";
import { apply } from './utils';


declare var __MODE__: string;


// sadly there's no good way to package workers and wasm directly so you need a way to get these two URLs from your bundler.
// This is the webpack5 way to create a asset bundle of the worker and wasm:
const workerUrl = new URL(
  "sql.js-httpvfs/dist/sqlite.worker.js",
  import.meta.url,
);
const wasmUrl = new URL(
  "sql.js-httpvfs/dist/sql-wasm.wasm",
  import.meta.url,
);
// the legacy webpack4 way is something like `import wasmUrl from "file-loader!sql.js-httpvfs/dist/sql-wasm.wasm"`.

async function initWorker() {
  console.log('WORKER INIT !!!!');
  const worker = await createDbWorker(
    [
      {
        from: "inline",
        config: {
          "serverMode": "chunked",
          "requestChunkSize": 4096,
          "databaseLengthBytes": 732532736,
          "serverChunkSize": 419430400,
          "urlPrefix": "https://cached.infinitenovelty.com/db.4.chunky/db.sqlite3.",
          "suffixLength": 3
        }
      }
      // {
      //   from: "jsonconfig",
      //   configUrl: "https://data.infinitenovelty.com/file/iabi-data/db.2.30MB/config.json"
      // }
    ],
    sqliteWorkerURL.toString(),
    sqlWASMURL.toString(),
  );
  return worker;
}

async function cursorQuery(randomStart: boolean, order: { fields: (keyof Cursor)[], direction: "asc" | "desc" }, where: string | null, worker: WorkerHttpvfs, limit: number, cursor: Cursor | null, initial: boolean): Promise<{ images: Image[], cursor: Cursor }> {
  let images;
  if (limit < 1) {
    throw "limit must be a positive number";
  }

  let q = query
    .select`rowid, *`
    .from`images`
    .limit([`${limit}`])
    .orderBy([order.fields.map(f => `${f} ${order.direction}`).join(", ")]);

  if (where) {
    q = q.where([where]);
  }

  if (cursor) {
    let comparator = { "asc": ">", "desc": "<" }[order.direction];
    if (initial) {
      comparator += "=";
    }
    let fieldString = order.fields.join(", ");
    let valueString = order.fields.map(field => cursor[field]).join(", ");
    q = q.where([`(${fieldString}) ${comparator} (${valueString})`]);
  } else {
    if (randomStart) {
      q = q.where(["(rowid >= abs(random() % (select max(rowid) from images)))"]);
    }
  }

  let qObj = q.build();
  console.log("executing SQL query:", qObj.sql);
  images = await worker.db.query(qObj.sql, qObj.values) as Image[];
  let lastImage = images[images.length - 1];
  let newCursor: Cursor = {
    "faves": lastImage.faves,
    "views": lastImage.views,
    "comments": lastImage.comments,
    "id": lastImage.id,
    "rowid": lastImage.rowid,
  };

  return {
    'images': images,
    'cursor': newCursor
  }
}

let randomCursorQuery = apply(cursorQuery, true, { fields: ["rowid"], direction: "asc" })

const QUERY_NAMES = ["random", "randompopular", "randomoverlooked", "popular"] as const;
type QueryName = typeof QUERY_NAMES[number];

let queries = {
  "random": apply(randomCursorQuery, null),
  "randompopular": apply(randomCursorQuery, "faves > 0"),
  "randomoverlooked": apply(randomCursorQuery, "views < 50 and faves = 0"),
  "popular": apply(cursorQuery, false, { fields: ["faves", "views", "comments", "id"], direction: "desc" }, "faves > 0"),
  "book": (bookId: string, ...args: [WorkerHttpvfs, number, Cursor | null, boolean]) => cursorQuery(false, { fields: ["faves", "views", "comments", "id"], direction: "desc" }, `bookid = ${bookId}`, ...args),
};

export { initWorker, queries, QUERY_NAMES };
