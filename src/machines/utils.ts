import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import { EventObject } from "xstate";
import { Image } from "./types";


function showToast(message: string, duration: number = 3000): void {
  console.log(message);
  Toastify({
    text: message,
    duration: duration,
    newWindow: true,
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "right", // `left`, `center` or `right`
    backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
    stopOnFocus: true, // Prevents dismissing of toast on hover
    className: "toast", // Adds a custom class to your toast
  }).showToast();
}


function idFromFlickrUrl(url: string) {
  let matches = url.match(/live\.staticflickr\.com\/.+\/(.*?)_.*\.jpg/);
  if (matches) {
    return matches[1];
  }
}

function flickrThumbUrl(id: string, server: string, secret: string) {
  return `https://live.staticflickr.com/${server}/${id}_${secret}_b_d.jpg`;
}

function flickrOrigUrl(id: string, server: string, original_secret: string) {
  return `https://live.staticflickr.com/${server}/${id}_${original_secret}_o.jpg`;
}

function apply<T extends unknown[], U extends unknown[], R>(fn: (...args: [...T, ...U]) => R, ...front: T) {
  return (...tailArgs: U) => fn(...front, ...tailArgs);
}

function marshalPhoto(image: Image) {
  return {
    thumbnailSrc: flickrThumbUrl(image.id, image.server, image.secret),
    enlargedSrc: flickrOrigUrl(image.id, image.server, image.original_secret),
    enlargedWidth: image.width,
    enlargedHeight: image.height,
    title: image.id,
    // link: data.link,
    id: image.id,
    link: `https://www.flickr.com/photos/internetarchivebookimages/${image.id}`,
    linkTarget: "_blank" as const, // _blank | _top | _self | _parent
    // color: string // HEX color for background before image display
  }
}

function assertEventType<TE extends EventObject, TType extends TE["type"]>(
  event: TE,
  eventType: TType
): asserts event is TE & { type: TType } {
  if (event.type !== eventType) {
    throw new Error(
      `Invalid event: expected "${eventType}", got "${event.type}"`
    );
  }
}

const isShallowEqual = (obj1: any, obj2: any) =>
  Object.keys(obj1).length === Object.keys(obj2).length &&
  Object.keys(obj1).every(key => obj1[key] === obj2[key]);

export {
  idFromFlickrUrl,
  flickrThumbUrl,
  flickrOrigUrl,
  apply,
  marshalPhoto,
  assertEventType,
  isShallowEqual,
  showToast
};

