import React from 'react';
import ReactDOM from 'react-dom/client';
import GlyphTable from './GlyphTable';
import './GlyphTable.css'

const root = ReactDOM.createRoot(document.getElementById('glyph-table-root'));
root.render(
  <React.StrictMode>
    <h1 style={{flexBasis: '100%'}}>Glyph Table Demo</h1>
    <GlyphTable width={50} height={20}/>
  </React.StrictMode>
);
