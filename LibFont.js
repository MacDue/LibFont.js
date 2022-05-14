"use strict";

/*
 * Copyright (c) 2022, MacDue <macdue@dueutil.tech>
 *
 * Heavily base off LibGfx/Font/BitmapFont.cpp:
 * Copyright (c) 2018-2020, Andreas Kling <kling@serenityos.org>
 *
 * (This is mostly a direct JavaScript translation)
 *
 * SPDX-License-Identifier: BSD-2-Clause
*/

const LibFont = (() => {
  const SIZE_OF_U32 = 4;

  const popCount = (int) => {
    let count = 0;
    for (; int != 0; int >>= 1)
      if (int & 0b1)
        ++count;
    return count;
  }

  class ByteSpan {
    constructor(bytes, offset = 0, length = undefined) {
      this.data = bytes
      this.offset = offset
      this.length = length || this.data.length
    }

    littleBytesToInt = () => {
      let intValue = 0;
      for (let i = this.length - 1; i >= 0; i--) {
        intValue = (intValue * 256) + this.at(i);
      }
      return intValue;
    }

    asString = () => {
      return new TextDecoder().decode(this.data.subarray(this.offset, this.offset + this.length))
    }

    slice = (start, length = undefined) => {
      return new ByteSpan(this.data, this.offset + start, length || (this.length - start))
    }

    at = (index) => {
      return this.data[this.offset + index];
    }

    last = () => {
      return this.at(this.length - 1)
    }

    size = () => {
      return this.length;
    }

    sliceTill = (byte) => {
      let matchIdx = 0;
      for (; matchIdx < this.length; matchIdx++) {
        if (this.at(matchIdx) === byte)
          break;
      }
      if (matchIdx < this.length)
        return this.slice(0, matchIdx)
      return this
    }
  }

  const parseFontHeader = (bytes) => {
    const magic = bytes.slice(0, 4).asString()
    if (magic !== "!Fnt") {
      throw new Error(`header.magic != '!Fnt', instead it's ${magic}`);
    }
    const name = bytes.slice(16, 32)
    if (name.last() !== 0) {
      throw new Error("Font name not null-terminated");
    }
    const family = bytes.slice(48, 32);
    if (family.last() !== 0) {
      throw new Error("Font family not null-terminated");
    }
    const glyphWidth = bytes.at(4)
    const glyphHeight = bytes.at(5);
    const rangeMaskSize = bytes.slice(6, 2).littleBytesToInt()
    const isVariableWidth = bytes.at(8)
    const glyphSpacing = bytes.at(9)
    const baseline = bytes.at(10)
    const meanLine = bytes.at(11)
    const presentationSize = bytes.at(12)
    const weight = bytes.slice(13, 2).littleBytesToInt();
    const slope = bytes.at(15)
    return {
      glyphWidth,
      glyphHeight,
      rangeMaskSize,
      isVariableWidth,
      glyphSpacing,
      baseline,
      meanLine,
      presentationSize,
      weight,
      slope,
      name: name.sliceTill(0).asString(),
      family: family.sliceTill(0).asString()
    }
  }

  class GlyphBitmap {
    constructor(rows, startIndex, width, height) {
      this.rows = rows;
      this.startIndex = startIndex;
      this.width = width;
      this.height = height;
    }

    row = (index) => {
      return this.rowSlice(index).littleBytesToInt();
    }

    bitAt = (x, y) => {
      return (this.rowSlice(y).at((x / 8) | 0) >> (x % 8)) & 0b1 == 1
    }

    static bytesPerRow = () => { return SIZE_OF_U32; }

    rowSlice = (y) => {
      return this.rows.slice(GlyphBitmap.bytesPerRow() * (this.startIndex + y), GlyphBitmap.bytesPerRow())
    }

    paintInto = (canvasCtx, x, y) => {
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          if (this.bitAt(c, r))
            canvasCtx.fillRect(x + c, y + r, 1, 1);
        }
      }
    }
  }

  class HiddenCanvas {
    constructor(width, height) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = width;
      this.canvas.height = height;
    }
    getContext2D = () => this.canvas.getContext('2d')
    toDataURL = () => this.canvas.toDataURL()
  }

  class Glyph {
    constructor(bitmap, leftBearing, advance, ascent) {
      this.bitmap = bitmap;
      this.leftBearing = leftBearing;
      this.advance = advance;
      this.ascent = ascent;
    }

    toDataURL = (fillStyle = 'black') => {
      const canvas = new HiddenCanvas(this.bitmap.width, this.bitmap.height);
      const ctx = canvas.getContext2D();
      ctx.fillStyle = fillStyle;
      this.bitmap.paintInto(ctx, 0, 0);
      return canvas.toDataURL();
    }
  }

  class BitmapFont {
    constructor(name, family, rows, widths, isFixedWidth, glyphWidth, glyphHeight, glyphSpacing, rangeMaskSize, rangeMask, baseline, meanLine, presentationSize, weight, slope) {
      this.name = name;
      this.family = family;
      this.rangeMaskSize = rangeMaskSize;
      this.rangeMask = rangeMask;
      this.rows = rows;
      this.glyphWidths = widths;
      this.glyphWidth = glyphWidth;
      this.glyphHeight = glyphHeight;
      this.minGlyphWidth = glyphWidth;
      this.maxGlyphWidth = glyphWidth;
      this.glyphSpacing = glyphSpacing;
      this.baseline = baseline;
      this.meanLine = meanLine;
      this.presentationSize = presentationSize;
      this.weight = weight;
      this.slope = slope;
      this.fixedWidth = isFixedWidth;
      this.xHeight = this.baseline - this.meanLine;
      this.glyphCount = 0;
      this.rangeIndices = []

      for (let i = 0, index = 0; i < this.rangeMaskSize; i++) {
        for (let j = 0; j < 8; j++) {
          if (this.rangeMask.at(i) & (1 << j)) {
            this.glyphCount += 256;
            this.rangeIndices.push(index++)
          } else {
            this.rangeIndices.push(null)
          }
        }
      }

      if (!this.fixedWidth) {
        let maximum = 0;
        let minimum = 255;
        for (let i = 0; i < this.glyphCount; i++) {
          if (this.glyphWidths.at(i) !== undefined) {
            minimum = Math.min(minimum, this.glyphWidths.at(i))
            maximum = Math.max(maximum, this.glyphWidths.at(i))
          }
        }
        this.minGlyphWidth = minimum;
        this.maxGlyphWidth = Math.max(maximum, this.glyphWidth)
      }
    }

    glyphIndex = (codepoint) => {
      const index = (codepoint / 256) | 0;
      if (index >= this.rangeIndices.length)
        return null
      if (this.rangeIndices[index] === null)
        return null
      return this.rangeIndices[index] * 256 + codepoint % 256;
    }

    glyphIndexWithReplacement = (codepoint) => {
      // Try getting the glyph, then the 0xFFFD REPLACEMENT CHARACTER, otherwise '?'
      return this.glyphIndex(codepoint) ?? this.glyphIndex(0xFFFD) ?? 0x3f;
    }

    codePointGlyphWidth = (codepoint) => {
      // TODO: Check for non-printable
      const index = this.glyphIndex(codepoint);
      return this.fixedWidth || index === null ? this.glyphWidth : this.glyphWidths.at(index);
    }

    glyphOrEmojiWidthForVariableWidthFont = (codepoint) => {
      if (codepoint < 0xFFFF) {
        const index = this.glyphIndexWithReplacement(codepoint);
        if (this.glyphWidths.at(index) > 0)
          return this.codePointGlyphWidth(codepoint);
        return this.codePointGlyphWidth(0xFFFD);
      }
      // TODO: Emoji!
      return this.glyphWidth;
    }

    glyphOrEmojiWidth = (codepoint) => {
      if (this.fixedWidth)
        return this.glyphWidth
      return this.glyphOrEmojiWidthForVariableWidthFont(codepoint);
    }

    glyph = (codepoint) => {
      const index = this.glyphIndexWithReplacement(codepoint);
      const width = this.glyphWidths.at(index);
      return new Glyph(
        new GlyphBitmap(this.rows, index * this.glyphHeight, width, this.glyphHeight),
        0, width, this.glyphWidth)
    }

    containsGlyph = (codepoint) => {
      const index = this.glyphIndex(codepoint);
      return index !== null && this.glyphWidths.at(index) > 0;
    }

    static loadFontFromUint8Array = (bytes) => {
      bytes = new ByteSpan(bytes);
      const header = parseFontHeader(bytes);
      let rangeMask = bytes.slice(80)

      let glyphCount = 0;
      for (let i = 0; i < header.rangeMaskSize; i++) {
        glyphCount += 256 * popCount(rangeMask.at(i))
      }
      const rows = rangeMask.slice(header.rangeMaskSize)
      const bytesPerGlyph = SIZE_OF_U32 * header.glyphHeight;
      const widths = rows.slice(glyphCount * bytesPerGlyph);

      return new BitmapFont(header.name, header.family, rows, widths, !header.isVariableWidth, header.glyphWidth, header.glyphHeight, header.glyphSpacing, header.rangeMaskSize, rangeMask, header.baseline, header.meanLine, header.presentationSize, header.weight, header.slope);
    }

    static loadFontFromArrayBuffer = (arrayBuffer) => {
      return this.loadFontFromUint8Array(new Uint8Array(arrayBuffer))
    }

    static loadFont = (url) => {
      return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        const fail = () => {
          reject(new Error("Failed to fetch font :^("))
        };
        req.onload = () => {
          if (req.status == 200)
            return resolve(req.response)
          fail()
        }
        req.onerror = fail;
        req.open("GET", url)
        req.responseType = "arraybuffer";
        req.send();
      }).then(this.loadFontFromArrayBuffer)
    }

    forEachGlyph = (text, callback) => {
      for (const char of text) {
        const codepoint = char.codePointAt(0);
        const glyph = this.glyph(codepoint);
        if (glyph) {
          callback(glyph, char, codepoint)
        }
      }
    }

    drawTextInto = (canvasCtx, drawX, drawY, text) => {
      let x = 0;
      this.forEachGlyph(text, (glyph, _, codepoint) => {
        glyph.bitmap.paintInto(canvasCtx, drawX + x, drawY)
        x += this.glyphOrEmojiWidth(codepoint) + this.glyphSpacing;
      })
    }

    textWidth = (text) => {
      let x = 0;
      this.forEachGlyph(text, (_, __, codepoint) => {
        x += this.glyphOrEmojiWidth(codepoint) + this.glyphSpacing;
      })
      return x;
    }

    getTextAsDataURL = (text, fillStyle = 'black') => {
      const canvas = new HiddenCanvas(this.textWidth(text), this.glyphHeight);
      const ctx = canvas.getContext2D();
      ctx.fillStyle = fillStyle;
      this.drawTextInto(ctx, 0, 0, text);
      return canvas.toDataURL();
    }

    getTextAsHTML = (text, fillStyle = 'black') => {
      const htmlGlyphMap = {};
      const container = document.createElement("div");
      text.split(/(\S+\s+)/).map(token => {
        const tokenContainer = document.createElement("span");
        tokenContainer.style.display = "inline-block";
        this.forEachGlyph(token, (glyph, character, codepoint) => {
          if (character == ' ')
            character = '\xa0';
          let htmlGlyph = htmlGlyphMap[character]?.cloneNode(true);
          if (!htmlGlyph) {
            const characterWidth = this.glyphOrEmojiWidth(codepoint);
            htmlGlyph = document.createElement("span");
            htmlGlyph.style.width = `${glyph.bitmap.width}px`;
            htmlGlyph.style.height = `${glyph.bitmap.height}px`;
            htmlGlyph.style.backgroundImage = `url(${glyph.toDataURL(fillStyle)})`;
            htmlGlyph.style.display = "inline-block";
            htmlGlyph.style.marginRight = `${this.glyphSpacing + characterWidth - glyph.bitmap.width}px`;
            htmlGlyph.innerText = character;
            htmlGlyph.style.fontSize = `${this.glyphHeight}px`;
            htmlGlyph.style.color = '#00000000';
            htmlGlyph.style.overflow = 'hidden';
            htmlGlyphMap[character] = htmlGlyph;
          }
          tokenContainer.appendChild(htmlGlyph);
        })
        container.appendChild(tokenContainer);
      })
      return container;
    };
  }

  return { ByteSpan, BitmapFont, Glyph, GlyphBitmap }
})()
