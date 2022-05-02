import clsx from "clsx";
import { Masonry, useInfiniteLoader } from "masonic";
import { ReactComponent as StarIcon } from './icons/star.svg';
import { Image } from "./machines/types";
import { flickrThumbUrl } from "./utils";


export function Gallery({ images, loadMore, toggleFave }: { images: Image[], loadMore: (startIndex: number, stopIndex: number) => void, toggleFave: (id: string) => void }) {
  const maybeLoadMore = useInfiniteLoader(
    (startIndex, stopIndex) => {
      loadMore(startIndex, stopIndex);
    },
    {
      isItemLoaded: (index, items) => !!items[index],
      minimumBatchSize: 32,
      threshold: 3
    }
  );

  const GalleryImage = ({ index, data, width }: { index: number, data: Image, width: number }) => {
    const imageHight = data.height;
    const imageWidth = data.width;
    const ratio = imageWidth / imageHight;
    const height = width / ratio;

    return (
      <div
        className={clsx("gallery-image")}
        key={data.id}
        style={{ height: `${height}px`, }}
        data-faved={data.isFaved ? "yes" : "no"}
      >
        <img
          alt="gallery image"
          src={flickrThumbUrl(data.id, data.server, data.secret, data.width, data.height, 300)}
          loading="eager"
        />
        <StarIcon
          onClick={() => toggleFave(data.id)}
        />
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
    />
  );
}