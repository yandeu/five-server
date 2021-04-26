/**
 * @author    Yannick Deubel (https://github.com/yandeu)
 * @copyright Copyright (c) 2021 Yannick Deubel
 * @license   {@link https://github.com/yandeu/five-server/blob/main/LICENSE LICENSE}
 */

export const fileTypes = {
  isAudio: (extname: string) => /(mid|midi|wma|aac|wav|ogg|mp3|mp4)$/i.test(extname),
  isHTML: (extname: string) => /(html)$/i.test(extname),
  isImage: (extname: string) => /(gif|jpg|jpeg|tiff|png|svg)$/i.test(extname),
  isPDF: (extname: string) => /(pdf)$/i.test(extname),
  isPHP: (extname: string) => /(php)$/i.test(extname),
  isVideo: (extname: string) => /(mpg|mpeg|avi|wmv|mov|ogg|webm|mp4|mkv)$/i.test(extname)
}
