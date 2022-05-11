# LibFont.js

This is a JavaScript translation/implementaion of the bitmap fonts from SerenityOS.

// TODO: Make a nicer README.md :^)

Example usage:
```js
const canvas = document.getElementById("some-canvas");
const ctx = canvas.getContext('2d');
// Set the fillStyle to any color you like!
ctx.fillStyle = 'black';

BitmapFont.loadFont(`./KaticaBold10.font`).then(font => {
  font.drawTextInto(ctx, 10, 10, "Well, hello friends!");
})
```

## API

### BitmapFont

#### Static Methods:

- `BitmapFont.loadFont(url) -> Promise<BitmapFont>`
  - Load a `.font` file from a URL
- `BitmapFont.loadFontFromArrayBuffer(buffer) -> BitmapFont`
  - Load a `.font` file from an array buffer
- `BitmapFont.loadFontFromUint8Array(array) -> BitmapFont`
  - Load a `.font` from a uint8 array

#### Class Methods:

- `font.drawTextInto(canvasCtx, drawX, drawY, text)`
  - Draw a some text into a canvas at `(drawX, drawY)`
- `font.glyph(codepoint) -> Glpyh`
  - Lookup the glyph for `codepoint`
- `font.glyphIndex(codepoint) -> Integer`
  - Look up the glyph index for `codepoint`
- `font.containsGlyph(codepoint) -> bool`
  - Check if a font contains a glyph for `codepoint`

#### Properties:

- `font.name`
- `font.family`
- `font.glyphHeight`
- `font.minGlyphWidth`
- `font.maxGlyphWidth`
- `font.glyphSpacing`
- `font.baseline`
- `font.meanLine`
- `font.presentationSize`
- `font.weight`
- `font.slope`
- `font.fixedWidth`
- `font.glyphCount`

### Glyph

#### Properties:

- `glyph.bitmap` (is a `GlyphBitmap`)
- `glyph.leftBearing`
- `glyph.advance`
- `glyph.ascent`

### GlyphBitmap

#### Static Methods:

- `GlyphBitmap.bytesPerRow`

#### Class Methods:

- `bitmap.paintInto(canvasCtx, x, y)`
  - Paint a glyph bitmap into a canvas at `(x, y)`
- `bitmap.bitAt(x,y)`
  - Look up the pixel (bit) of a glyph at `(x, y)`
- `bitmap.row(index)`
- `bitmap.rowSlice(y)`

#### Properties:

- `bitmap.width`
- `bitmap.height`
