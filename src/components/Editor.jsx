import React, { memo } from 'react';
import TextBuffer from './TextBuffer.jsx';

const Editor = memo(function Editor({ content, onChange, viewportHeight, onCursorMove, editorWidth }) {
  return (
    <TextBuffer
      content={content}
      onChange={onChange}
      isFocused={true}
      viewportHeight={viewportHeight}
      onCursorMove={onCursorMove}
      editorWidth={editorWidth}
    />
  );
});

export default Editor;
