interface Image {
  rowid: number;
  id: string;
  server: string;
  secret: string;
  original_secret: string;
  width: number;
  height: number;
  faves: number;
  comments: number;
  views: number;
  isFaved?: boolean;
}

type Cursor = Pick<Image, "faves" | "views" | "comments" | "id" | "rowid">;

type Query = (limit: number, cursor: Cursor | null, initial: boolean) => Promise<{
  images: Image[];
  cursor: Cursor;
}>

export type { Image, Cursor, Query };
