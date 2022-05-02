export const flickrThumbUrl = (id: string, server: string, secret: string, imgWidth: number, imgHeight: number, maxDisplayWidth: number) => {
  const sizeCode = getSizeCode(imgWidth, imgHeight, maxDisplayWidth, window.devicePixelRatio);

  return `https://live.staticflickr.com/${server}/${id}_${secret}${sizeCode ? "_" + sizeCode : ""}.jpg`;
}

export const flickrOrigUrl = (id: string, server: string, original_secret: string) => {
  return `https://live.staticflickr.com/${server}/${id}_${original_secret}_o.jpg`;
}
const SIZES = {
  "240": "m",
  "320": "n",
  "400": "w",
  "500": "",
  "640": "z",
  "800": "c",
  "1024": "b"
} as { [key: string]: string };

export const getSizeCode = (imgWidth: number, imgHeight: number, maxDisplayWidth: number, pixelRatio: number): typeof SIZES[keyof typeof SIZES] => {
  // based on the imgWidth and imgHeight, calculate the aspect ratio.
  const aspectRatio = imgWidth / imgHeight;
  // use the aspect ratio and the maxDisplayWidth to determine the maximum height
  const maxDisplayHeight = maxDisplayWidth / aspectRatio;
  // take the "longest dimension" of the maximum height and the maxDisplayWidth
  let maxDisplaySize = Math.max(maxDisplayHeight, maxDisplayWidth);
  // adjust maxDisplaySize based on the pixel ratio
  maxDisplaySize = maxDisplaySize * pixelRatio;
  // find the smallest SIZE that is larger than that longest dimension
  let size = Object.keys(SIZES).find(key => parseInt(key) > maxDisplaySize);
  // if no size is found, use the largest size
  size = size ? size : "1024";

  return SIZES[size];
}
