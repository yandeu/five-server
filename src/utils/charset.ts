/**
 * @author      Benjamin Thomas (https://github.com/bentomas)
 * @author      Robert Kieffer (https://github.com/broofa)
 * @copyright   Copyright (c) 2010 Benjamin Thomas, Robert Kieffer
 * @license     {@link https://github.com/broofa/mime/blob/v1.x/LICENSE MIT}
 * @description charset() methods have been removed from mime v2, this is why I added it here
 */

/** Lookup a charset based on mime type. */
export const charsets = {
  lookup: (mimeType, fallback?) => {
    // Assume text types are utf8
    return /^text\/|^application\/(javascript|json)/.test(mimeType) ? 'utf-8' : fallback
  }
}
