import React from 'react';
import ReactDOM from 'react-dom/client';
import GlyphTable from './GlyphTable';
import './GlyphTable.css'

const root = ReactDOM.createRoot(document.getElementById('glyph-table-root'));
root.render(
  <React.StrictMode>
    <GlyphTable width={50} height={20}/>
  </React.StrictMode>
);
