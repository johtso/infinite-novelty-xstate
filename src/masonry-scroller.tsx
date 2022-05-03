import type { UseMasonryOptions } from "masonic";
import { useMasonry, useScroller } from "masonic";
import { useState } from "react";
/**
 * A heavily-optimized component that updates `useMasonry()` when the scroll position of the browser `window`
 * changes. This bare-metal component is used by `<Masonry>` under the hood.
 *
 * @param props
 */
export function MasonryScroller<Item>(props: MasonryScrollerProps<Item>) {
  // We put this in its own layer because it's the thing that will trigger the most updates
  // and we don't want to slower ourselves by cycling through all the functions, objects, and effects
  // of other hooks
  const [savedScrollTop, setSavedScrollTop] = useState<number | null>(null);
  const { scrollTop, isScrolling } = useScroller(props.offset, props.scrollFps);
  // This is an update-heavy phase and while we could just Object.assign here,
  // it is way faster to inline and there's a relatively low hit to he bundle
  // size.
  if (props.paused && savedScrollTop === null) {
    setSavedScrollTop(scrollTop);
  } else if (!props.paused && savedScrollTop !== null) {
    setSavedScrollTop(null);
  }

  return useMasonry<Item>({
    scrollTop: savedScrollTop === null ? scrollTop : savedScrollTop,
    isScrolling: props.paused === true ? false : isScrolling,
    positioner: props.positioner,
    resizeObserver: props.resizeObserver,
    items: props.items,
    onRender: props.onRender,
    as: props.as,
    id: props.id,
    className: props.className,
    style: props.style,
    role: props.role,
    tabIndex: props.tabIndex,
    containerRef: props.containerRef,
    itemAs: props.itemAs,
    itemStyle: props.itemStyle,
    itemHeightEstimate: props.itemHeightEstimate,
    itemKey: props.itemKey,
    overscanBy: props.overscanBy,
    height: props.height,
    render: props.render,
  });
}

export interface MasonryScrollerProps<Item>
  extends Omit<UseMasonryOptions<Item>, "scrollTop" | "isScrolling"> {
  /**
   * This determines how often (in frames per second) to update the scroll position of the
   * browser `window` in state, and as a result the rate the masonry grid recalculates its visible cells.
   * The default value of `12` has been very reasonable in my own testing, but if you have particularly
   * heavy `render` components it may be prudent to reduce this number.
   *
   * @default 12
   */
  scrollFps?: number;
  /**
   * The vertical space in pixels between the top of the grid container and the top
   * of the browser `document.documentElement`.
   *
   * @default 0
   */
  offset?: number;
  paused?: boolean;
}
