import { Masonry, useInfiniteLoader } from "masonic";
import { ReactComponent as StarIcon } from './icons/star.svg';
import { Image } from "./machines/types";
import { flickrThumbUrl } from "./utils";



export function Gallery({ images, loadMore, toggleFave }: { images: Image[], loadMore: (count: number) => void, toggleFave: (id: string) => void }) {

  const maybeLoadMore = useInfiniteLoader(
    (startIndex, stopIndex) => {
      loadMore(stopIndex - startIndex);
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
        className="gallery-image"
        key={data.id}
        style={{ height: `${height}px`, }}
        data-faved={data.isFaved ? "yes" : "no"}
      >
        <img alt="gallery image" src={flickrThumbUrl(data.id, data.server, data.secret)} loading="eager" />
        <StarIcon
          onClick={() => toggleFave(data.id)}
        />
      </div>
    )
  };


  return (
    <Masonry
      onRender={maybeLoadMore}
      // Provides the data for our grid items
      items={images}
      // Adds 8px of space between the grid cells
      columnGutter={4}
      rowGutter={2}
      // Sets the minimum column width to 172px
      columnWidth={300}
      // Pre-renders 5 windows worth of content
      overscanBy={3}
      // This is the grid item component
      render={GalleryImage}
    />
  );
}