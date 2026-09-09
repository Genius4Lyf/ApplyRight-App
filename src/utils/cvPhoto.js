// Preparing a CV headshot for draft storage.
//
// One utility, because the Studio intake (ContactConfirmCard) and the Live Preview editor
// (PreviewContactBlock) both write the same `personalInfo.photoUrl`, and two code paths
// producing different sizes for one field is how a CV ends up with a photo that looks
// right in the preview and wrong on the page.

// WHAT WE ACTUALLY ACCEPT.
//
// The pickers used to say `accept="image/*"`, which is not a format list — it is every
// image the browser will admit to knowing, including several this pipeline cannot use:
//
//   · SVG    — an XML document. It is also an active-content format, so decoding one
//              from an untrusted upload is a class of problem a CV photo has no reason
//              to take on.
//   · HEIC   — what an iPhone shoots by default. Safari decodes it; Chrome and Firefox
//              do not, so <img> never fires onload and the upload failed with a silent
//              "invalid image" that named nothing.
//   · TIFF/BMP — decoded by almost nothing, and enormous.
//
// A file the canvas cannot decode failed AFTER the read, as an unexplained no-op, with
// the previous photo left in place and nothing said. Naming the formats up front is the
// difference between "that didn't work" and "save it as a JPG".
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The `accept` attribute for a file input. Extensions AND mime types: a mime type alone
// misses files the OS has not registered, and an extension alone misses a correctly typed
// file that was renamed.
export const PHOTO_ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

/** Human-readable list for the hint under the control, e.g. "JPG, PNG or WEBP". */
export const PHOTO_FORMAT_LABEL = 'JPG, PNG or WEBP';

// Generous for a headshot — a modern phone photo is 3–8MB — and small enough to fail fast
// on someone who picked a RAW export by mistake. The OUTPUT is bounded separately below,
// so this only guards how much we ask the browser to decode.
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

/** The square the CV photo is stored at. Bounded so a draft never carries a full-size image. */
export const PHOTO_OUTPUT_SIZE = 320;

export class PhotoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PhotoError';
    // A code so callers can show their own translated copy rather than parsing a string.
    this.code = code;
  }
}

/**
 * Check a chosen file before anything is read.
 *
 * Separate from the decode so a picker can reject instantly, on the file's own metadata,
 * without waiting for a multi-megabyte FileReader pass that was always going to fail.
 *
 * @param {File} file
 * @throws {PhotoError} code: NO_FILE | UNSUPPORTED_TYPE | TOO_LARGE
 */
export const assertUsablePhoto = (file) => {
  if (!file) throw new PhotoError('NO_FILE', 'No file was selected.');

  // Some browsers hand over an empty `type` for a file dragged from an unusual source, so
  // the extension is the fallback rather than an immediate rejection.
  const type = (file.type || '').toLowerCase();
  const named = /\.(jpe?g|png|webp)$/i.test(file.name || '');
  if (!ACCEPTED_PHOTO_TYPES.includes(type) && !named) {
    throw new PhotoError('UNSUPPORTED_TYPE', `Use a ${PHOTO_FORMAT_LABEL} image.`);
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new PhotoError('TOO_LARGE', 'That image is larger than 12MB.');
  }
};

/**
 * Load a chosen file as an HTMLImageElement, so a caller can measure it and let the user
 * frame it before anything is cropped.
 *
 * @param {File} file
 * @returns {Promise<{ image: HTMLImageElement, src: string }>}
 */
export const loadPhoto = (file) =>
  new Promise((resolve, reject) => {
    try {
      assertUsablePhoto(file);
    } catch (error) {
      reject(error);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new PhotoError('UNREADABLE', 'Could not read that image.'));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () =>
        reject(
          new PhotoError(
            'UNDECODABLE',
            `Could not open that image. Use a ${PHOTO_FORMAT_LABEL} file.`
          )
        );
      image.onload = () => resolve({ image, src: String(reader.result) });
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/**
 * Render a square JPEG from a chosen region of an image.
 *
 * WHY A REGION AND NOT A CENTRE CROP. This used to take the largest centred square, which
 * is the one rule guaranteed to be wrong for the photo people actually upload: a full- or
 * half-body shot, or any picture where the subject is not dead centre. It produced CVs
 * headed by a photo of someone's chest, or half a face, with no way to correct it — the
 * only recourse was to go and crop the file in another program first.
 *
 * `zoom` and the offsets describe what the user framed; with zoom 1 and no offset this
 * still produces exactly the old centred square, so an un-adjusted photo is unchanged.
 *
 * @param {HTMLImageElement} image  a decoded image
 * @param {object} [frame]
 * @param {number} [frame.zoom=1]   >= 1; how far in the user zoomed
 * @param {number} [frame.offsetX=0] -1..1 of the spare width, negative moves the crop left
 * @param {number} [frame.offsetY=0] -1..1 of the spare height
 * @returns {string} a data: URL
 */
export const cropPhotoToDataUrl = (image, { zoom = 1, offsetX = 0, offsetY = 0 } = {}) => {
  const size = PHOTO_OUTPUT_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoError('NO_CANVAS', 'Image processing is unavailable.');

  // The side of the source square being sampled. Zooming in samples LESS of the original.
  const side = Math.min(image.width, image.height) / Math.max(1, zoom);
  // How far the crop can travel before it leaves the image, in each axis.
  const spareX = (image.width - side) / 2;
  const spareY = (image.height - side) / 2;
  const clamp = (v) => Math.max(-1, Math.min(1, v));

  const sourceX = spareX + clamp(offsetX) * spareX;
  const sourceY = spareY + clamp(offsetY) * spareY;

  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size);

  let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  // A draft is saved as JSON; an oversized photo makes every autosave heavier forever.
  if (dataUrl.length > 220_000) dataUrl = canvas.toDataURL('image/jpeg', 0.6);
  return dataUrl;
};

/**
 * The one-shot path: file in, centred square out.
 *
 * Kept because not every caller offers framing, and because it is the exact behaviour
 * that shipped before — so a surface that has not been updated is unchanged. It now
 * validates the format first, which is the only difference.
 *
 * @param {File} file
 * @returns {Promise<string>} a data: URL
 */
export const prepareCvPhoto = async (file) => {
  const { image } = await loadPhoto(file);
  return cropPhotoToDataUrl(image);
};
