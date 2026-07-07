Add safeguards to the app icon on the winner screen so it keeps a perfect 1:1 aspect ratio without being cropped.

- Add `aspect-square` to the `<div>` container around the favicon to lock the container to a square ratio.
- Add `object-contain` to the `<img>` element so the image scales down to fit inside without being cropped or warped.
- Keep the existing `h-28 w-28` sizing so the visual size stays the same.