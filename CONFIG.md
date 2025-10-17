# Splitmark Configuration

Splitmark supports user configuration through a `.splitmarkrc` file in your home directory.

## Configuration File Location

- **Linux/macOS**: `~/.splitmarkrc`
- **Windows**: `C:\Users\YourUsername\.splitmarkrc`

## Automatic Creation

On first run, splitmark will automatically create a default configuration file if one doesn't exist.

## Platform-Specific Default Location

Splitmark automatically detects the correct Documents folder for your platform:

- **Windows**: Uses PowerShell to detect your actual Documents folder (handles OneDrive redirection)
  - Example: `C:\Users\YourName\OneDrive\Documents\Splitmark`
  - Or: `C:\Users\YourName\Documents\Splitmark` (if not using OneDrive)
- **macOS**: `~/Documents/Splitmark`
- **Linux**: Uses XDG Documents directory or `~/Documents/Splitmark`

## Default Configuration

```json
{
  "defaultLocation": "~/Documents/Splitmark",
  "layout": "side",
  "showPreview": true,
  "columnWidthRatio": 75,
  "format": {
    "wrapColumn": 80
  },
  "theme": {
    "editor": {
      "background": "#1e1e1e",
      "foreground": "#d4d4d4",
      "lineNumber": "#858585",
      "cursor": "#ffffff",
      "selection": "#264f78"
    },
    "syntax": {
      "keyword": "#C586C0",
      "string": "#CE9178",
      "number": "#B5CEA8",
      "comment": "#6A9955",
      "function": "#DCDCAA",
      "variable": "#9CDCFE",
      "type": "#4EC9B0",
      "operator": "#D4D4D4"
    },
    "preview": {
      "background": "#1e1e1e",
      "foreground": "#d4d4d4",
      "heading": "#ffffff",
      "link": "#3794ff",
      "code": {
        "background": "#2d2d2d",
        "foreground": "#d4d4d4"
      }
    }
  }
}
```

## Configuration Options

### `defaultLocation`
- **Type**: String (file path)
- **Default**: `~/Documents/Splitmark`
- **Description**: Default directory for saving markdown files when no path is specified

### `layout`
- **Type**: String
- **Values**: `"side"` or `"bottom"`
- **Default**: `"side"`
- **Description**: Default preview layout (side-by-side or top-bottom)

### `showPreview`
- **Type**: Boolean
- **Default**: `true`
- **Description**: Whether to show the preview pane by default

### `columnWidthRatio`
- **Type**: Number
- **Values**: `25`, `50`, or `75`
- **Default**: `75`
- **Description**: Editor width percentage in side-by-side layout (75%, 50%, or 25%)

### `format.wrapColumn`
- **Type**: Number
- **Default**: `80`
- **Description**: Target column width used by the in-editor Markdown formatter (Ctrl+Shift+F)

### `theme`
- **Type**: Object
- **Description**: Color theme settings for editor, syntax highlighting, and preview
- **Note**: Currently uses VSCode Dark+ theme colors by default

## File Path Resolution

Splitmark intelligently resolves file paths based on your configuration:

### Simple Filename
```bash
splitmark notes.md
# Creates: ~/Documents/Splitmark/notes.md
```

### Folder + Filename
```bash
splitmark projects/myapp/README.md
# Creates: ~/Documents/Splitmark/projects/myapp/README.md
# Automatically creates folders if they don't exist
```

### Relative Paths (Current Directory)
```bash
splitmark ./local.md
# Uses current directory, not default location
```

### Relative Paths (Parent Directory)
```bash
splitmark ../parent.md
# Uses parent directory, not default location
```

### Absolute Paths
```bash
splitmark /absolute/path/to/file.md
# Uses exact path specified
```

## CLI Option Overrides

Command-line options override configuration file settings:

```bash
# Override layout
splitmark file.md --layout bottom

# Disable preview
splitmark file.md --no-preview
```

## Example Workflows

### Personal Notes
```bash
# Quick note - saved to ~/Documents/Splitmark/
splitmark quick-note.md

# Organized notes
splitmark meetings/2024-01-15.md
splitmark ideas/project-alpha.md
```

### Project Documentation
```bash
# Change default location in config
{
  "defaultLocation": "~/projects/docs"
}

# Now all files go to ~/projects/docs by default
splitmark api.md              # ~/projects/docs/api.md
splitmark guides/setup.md     # ~/projects/docs/guides/setup.md
```

## Customizing Your Config

Edit `~/.splitmarkrc` with your preferred settings:

```json
{
  "defaultLocation": "/path/to/your/notes",
  "layout": "bottom",
  "showPreview": true,
  "columnWidthRatio": 50,
  "format": {
    "wrapColumn": 72
  }
}
```

Changes take effect the next time you launch splitmark.
