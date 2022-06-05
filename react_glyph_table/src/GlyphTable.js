import React from 'react';
import Tooltip from 'rc-tooltip';
import { FixedSizeGrid as Grid } from 'react-window';

const LibFont = require("./LibFont.js");

const renderedGlyphs = {}

const Glyph = ({ data: { fontName, columnCount, glyphs, glyphIndexToCodepoint }, columnIndex, rowIndex, style }) => {
  const flatIndex = rowIndex * columnCount + columnIndex;
  const glyphData = glyphs[flatIndex];
  if (!glyphData) {
    return <div className='glyph' style={style}></div>
  }
  const [glyph, index] = glyphData;
  const codepoint = glyphIndexToCodepoint(index);
  const char = String.fromCodePoint(codepoint);

  const glyphImage = renderedGlyphs[codepoint] ?? (() => {
    const image = glyph.toDataURL();
    renderedGlyphs[codepoint] = image;
    return image;
  })()

  const codepointHex = codepoint.toString(16).toUpperCase().padStart(4, 0);
  return (
    <Tooltip mouseEnterDelay={0.2} placement="top" overlay={
        <div className='glyph-tooltip'>
          <h2>{codepointHex} - {char}</h2>
          <img className='glyph-tooltip-img' src={glyphImage}></img>
        </div>
        }>
      <a
        href={`https://fonts.serenityos.net/char/${codepointHex}#${fontName}`}
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
      </a>
    </Tooltip>)
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

