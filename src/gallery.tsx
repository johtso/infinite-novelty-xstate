import clsx from "clsx";
import { useInfiniteLoader } from "masonic";
import { ReactComponent as BookIcon } from './icons/book.svg';
import { ReactComponent as StarIcon } from './icons/star.svg';
import { Image } from "./machines/types";
import { Masonry } from "./masonry";
import { flickrThumbUrl } from "./utils";


interface GalleryProps {
  images: Image[];
  loadMore: (startIndex: number, stopIndex: number) => void;
  toggleFave: (id: string) => void;
  paused?: boolean;
  // viewBook: (id: string) => void;
}

export function Gallery({ images, loadMore, toggleFave, paused }: GalleryProps) {
  const maybeLoadMore = useInfiniteLoader(
    (startIndex, stopIndex) => {
      loadMore(startIndex, stopIndex);
    },
    {
      isItemLoaded: (index, items) => !!items[index],
      minimumBatchSize: 10,
      threshold: 3
    }
  );

  const GalleryImage = ({ index, data, width }: { index: number, data: Image, width: number }) => {
    const imageHight = data.height;
    const imageWidth = data.width;
    const ratio = imageWidth / imageHight;
    const height = width / ratio;

    const imageUrl = flickrThumbUrl(data.id, data.server, data.secret, data.width, data.height, 300);
    return (
      <div
        className={clsx("gallery-image")}
        key={data.id}
        style={{ height: `${height}px`, backgroundImage: `url(${imageUrl})` }}
        data-faved={data.isFaved ? "yes" : "no"}
      >
        {/* <img
          alt="gallery image"
          src={flickrThumbUrl(data.id, data.server, data.secret, data.width, data.height, 300)}
          loading="eager"
        /> */}
        <div className="image-buttons">
          <StarIcon
            className="fave-button image-button"
            onClick={() => toggleFave(data.id)}
          />
          <a
            href={`/book/${data.bookid}`}
            title="view book"
            className="book-button image-button no-style-anchor"
          >
            <BookIcon />
          </a>
        </div>
      </div>
    )
  };


  return (
    <Masonry
      onRender={maybeLoadMore}
      items={images}
      columnGutter={4}
      columnWidth={300}
      overscanBy={3}
      render={GalleryImage}
      itemKey={(data) => data.id}
      paused={paused}
    />
  );
}