export const flickrThumbUrl = (id: string, server: string, secret: string) => {
  return `https://live.staticflickr.com/${server}/${id}_${secret}_b_d.jpg`;
}

export const flickrOrigUrl = (id: string, server: string, original_secret: string) => {
  return `https://live.staticflickr.com/${server}/${id}_${original_secret}_o.jpg`;
}
