# LibFont.js

This is a JavaScript translation/implementaion of the bitmap fonts from SerenityOS.

// TODO: README.md :^)

Example usage:
```js
const canvas = document.getElementById("some-canvas");
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'black';

BitmapFont.loadFont(`./KaticaBold10.font`).then(font => {
  font.drawTextInto(ctx, 10, 10, "Well, hello friends!");
})
```

