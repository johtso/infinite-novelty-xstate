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
}

type Cursor = Pick<Image, "faves" | "views" | "comments" | "id" | "rowid">;

export type { Image, Cursor };
