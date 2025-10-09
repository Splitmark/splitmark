import React, { useState } from 'react';
import { useApp } from 'ink';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import FileExplorer from './components/FileExplorer.jsx';
import App from './App.jsx';

export default function FileExplorerApp({ config }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [explorerKey, setExplorerKey] = useState(0);
  const { exit } = useApp();

  const handleSelectFile = (filePath) => {
    try {
      // Read file if it exists, otherwise start with empty content
      const content = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';

      setSelectedFile(filePath);
      setFileContent(content);
    } catch (error) {
      console.error(`Error loading file: ${error.message}`);
      exit();
    }
  };

  const handleExitExplorer = () => {
    exit();
  };

  const handleExitEditor = () => {
    // Close the editor and force FileExplorer remount with new key
    setExplorerKey(prev => prev + 1);
    setSelectedFile(null);
    setFileContent('');
  };

  // Show editor if a file is selected, otherwise show explorer
  if (selectedFile) {
    return (
      <App
        key={selectedFile}
        filePath={selectedFile}
        initialContent={fileContent}
        layout={config.layout}
        showPreview={config.showPreview}
        config={config}
        onExit={handleExitEditor}
      />
    );
  }

  return (
    <FileExplorer
      key={`explorer-${explorerKey}`}
      initialPath={config.defaultLocation}
      onSelectFile={handleSelectFile}
      onExit={handleExitExplorer}
    />
  );
}
