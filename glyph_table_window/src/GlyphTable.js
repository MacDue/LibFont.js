import React from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

const LibFont = require("./LibFont.js");

const renderedGlyphs = {}

const Glyph = ({ data: { fontName, columnCount, glyphs, glyphIndexToCodepoint }, columnIndex, rowIndex, style }) => {
  const flatIndex = rowIndex * columnCount + columnIndex;
  const [glyph, index] = glyphs[flatIndex] ?? glyphs[0];
  const codepoint = glyphIndexToCodepoint(index);
  const char = String.fromCodePoint(codepoint);

  const glyphImage = renderedGlyphs[codepoint] ?? (() => {
    const image = glyph.toDataURL();
    renderedGlyphs[codepoint] = image;
    return image;
  })()
  return (<a
    href={`https://fonts.serenityos.net/char/${codepoint.toString(16).toUpperCase().padStart(4, 0)}#${fontName}`}
    className="glyph"
    style={style}
  >
    <span
      style={{
        backgroundImage: `url(${glyphImage})`,
        width: `${glyph.bitmap.width}px`,
        height: `${glyph.bitmap.height}px`
      }}
    >
      {char}
    </span>
  </a>)
}

const FONT_BASE = "fonts"

class GlyphTable extends React.Component {

  componentDidMount = () => {
    const fontName = window.location.hash?.substring(1) || "KaticaRegular10";
    LibFont.BitmapFont.loadFont(`${FONT_BASE}/${fontName}.font`).then(font => {
      /* Hacky, hacky, hacks! */
      const rangeIdxMap = [];
      font.rangeIndices.forEach((value, index) => {
        rangeIdxMap[value] = index;
      })

      const glyphs = new Array(font.accurateGlyphCount());
      let glyphIdx = 0;
      font.forEachFontGlyph((glyph, index) => {
        glyphs[glyphIdx] = [glyph, index]
        glyphIdx++;
      });

      this.setState({
        font,
        fontName,
        glyphs,
        rangeIdxMap
      });
    })
  }

  glyphIndexToCodepoint = (index) => {
    const lowerCodepointByte = index & 0xff;
    const rangeIdx = index >> 8;
    let upperCodepointByte = this.state.rangeIdxMap[rangeIdx]
    return (upperCodepointByte << 8) | lowerCodepointByte;
  }

  render = () => {
    const { font, fontName, glyphs } = this.state ?? {};
    const { width: widthGlyphs, height: heightGlyphs } = this.props;
    if (!font) {
      return <span>Loading...</span>;
    }
    const glyphWidth = font.maxGlyphWidth + 6;
    const glyphHeight = font.glyphHeight + 8;
    const glyphIndexToCodepoint = this.glyphIndexToCodepoint;
    return (
      <Grid
        className="glyph-table"
        style={{overflowX: 'hidden'}}
        columnCount={widthGlyphs}
        rowCount={Math.ceil(glyphs.length/widthGlyphs) | 0}
        columnWidth={glyphWidth}
        rowHeight={glyphHeight}
        height={heightGlyphs * glyphHeight}
        width={widthGlyphs * glyphWidth}
        itemData={{ columnCount: widthGlyphs, fontName, glyphs, glyphIndexToCodepoint }}
      >
        {Glyph}
      </Grid>
    );
  }
}

export default GlyphTable;

