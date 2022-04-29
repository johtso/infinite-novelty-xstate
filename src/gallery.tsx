import { Masonry, useInfiniteLoader } from "masonic";
import { Image } from "./machines/types";
import { flickrThumbUrl } from "./utils";


const GalleryImage = ({ index, data, width }: { index: number, data: Image, width: number }) => {
  const imageHight = data.height;
  const imageWidth = data.width;
  const ratio = imageWidth / imageHight;
  const height = width / ratio;

  return (
    <div className="gallery-image" key={data.id} onClick={() => alert(`${data.id} clicked`)} style={`height: ${height}px`} >
      <img alt="gallery image" src={flickrThumbUrl(data.id, data.server, data.secret)} />
    </div>
  )
};

export function Gallery({ images, loadMore }: { images: Image[], loadMore: (count: number) => void }) {

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
      overscanBy={2}
      // This is the grid item component
      render={GalleryImage}
    />
  );
}