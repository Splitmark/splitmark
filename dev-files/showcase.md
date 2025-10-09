# Splitmark - Terminal Markdown Editor

> A powerful CLI editor with **live preview** for all your Markdown needs

## ✨ Key Features

Splitmark combines the simplicity of terminal editing with real-time preview capabilities:

- 🎨 **Syntax Highlighting** - Color-coded Markdown elements
- 👀 **Live Preview** - See changes instantly
- ⚡ **Fast & Lightweight** - Built with React and Ink
- 📁 **File Explorer** - Browse and manage your documents
- ⌨️ **Intuitive Shortcuts** - Familiar keyboard controls

---

## 📝 Writing in Markdown

### Text Formatting

You can make text **bold**, *italic*, or ***both***. Use `inline code` for technical terms and ~~strikethrough~~ for deletions.

### Code Blocks

```javascript
function splitmark() {
  const editor = new MarkdownEditor({
    preview: true,
    layout: 'side-by-side'
  });

  return editor.start();
}
```

```python
def create_document():
    """Create a new Markdown document"""
    doc = Document()
    doc.add_heading("Welcome to Splitmark")
    return doc.save()
```

### Lists & Organization

#### Ordered Lists

1. Open your terminal
2. Run `splitmark myfile.md`
3. Start writing!

#### Unordered Lists

- **Edit** your content in the left pane
- **Preview** renders in real-time on the right
- **Save** with Ctrl+S
- **Toggle** preview with Ctrl+P

#### Nested Lists

* Project Documentation
  * Setup Guide
  * API Reference
  * Troubleshooting
* Meeting Notes
  * 2024 Q1 Planning
  * Team Retrospective
* Personal Notes
  * Reading List
    * Technical Books
    * Fiction
  * Ideas & Inspiration

### Task Lists

- [x] Install Splitmark
- [x] Create first document
- [x] Learn keyboard shortcuts
- [ ] Write project documentation
- [ ] Share with team

---

## 📊 Tables

| Feature | Description | Status |
|---------|-------------|--------|
| Live Preview | Real-time Markdown rendering | ✅ Complete |
| Syntax Highlighting | Color-coded editor | ✅ Complete |
| File Explorer | Browse documents | ✅ Complete |
| Undo/Redo | Full editing history | ✅ Complete |
| Configuration | Customizable settings | ✅ Complete |

---

## 🔗 Links & References

Check out the [official documentation](https://github.com/splitmark/splitmark) for more details.

Learn more about [Markdown syntax](https://www.markdownguide.org/) and best practices.

---

## 💡 Tips & Tricks

### Pro Tips

1. **Quick Save**: Use Ctrl+S to save your work instantly
2. **Preview Toggle**: Ctrl+P shows or hides the preview pane
3. **Layout Switch**: Ctrl+L toggles between side-by-side and stacked layouts
4. **Config Access**: Ctrl+O opens your configuration file

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+O` | Open config |
| `Ctrl+X` | Exit |
| `Ctrl+P` | Toggle preview |
| `Ctrl+L` | Change layout |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

---

## 📖 Quotes & Wisdom

> "The best writing tools are the ones that get out of your way."
>
> — Every writer ever

> Splitmark lets you focus on **writing**, not formatting.
> Preview your work without leaving the terminal.

---

## 🎯 Use Cases

### 1. Documentation
Perfect for creating README files, API docs, and technical guides.

### 2. Note-Taking
Capture ideas quickly with Markdown's simple syntax.

### 3. Blogging
Draft your posts with live preview before publishing.

### 4. Project Planning
Organize tasks, ideas, and roadmaps efficiently.

---

## 🌟 Why Choose Splitmark?

### Speed
Lightning-fast startup and editing. No GUI overhead, just pure terminal efficiency.

### Simplicity
Clean interface. Intuitive controls. Zero learning curve if you know Markdown.

### Power
All the features you need: syntax highlighting, file management, undo/redo, and more.

### Flexibility
Works on Linux, macOS, and Windows. Customize to your workflow with config files.

---

## 🚀 Getting Started

### Installation

```bash
npm install -g splitmark
```

### Usage

```bash
# Open file explorer
splitmark

# Edit specific file
splitmark document.md

# Create new file in default location
splitmark notes/ideas.md
```

---

## 📚 Examples

### Example 1: Meeting Notes

```markdown
# Team Meeting - Q1 2024

**Date:** January 15, 2024
**Attendees:** Alice, Bob, Carol

## Agenda
1. Project status update
2. Q1 goals review
3. Resource allocation

## Action Items
- [ ] Alice: Update roadmap
- [ ] Bob: Review budget
- [ ] Carol: Schedule follow-up
```

### Example 2: Technical Documentation

```markdown
# API Endpoint Reference

## POST /api/documents

Creates a new document.

**Parameters:**
- `title` (string): Document title
- `content` (string): Markdown content
- `tags` (array): Optional tags

**Response:**
{
  "id": "doc123",
  "status": "created",
  "url": "/documents/doc123"
}
```

---

## 🎨 Styling Options

You can combine **bold** and *italic* for ***emphasis***.

Use `monospace` for code and commands.

Add horizontal rules to separate sections:

---

## 🏆 Advanced Features

### Nested Structures

1. **First Level**
   - Second level item
   - Another second level
     - Third level detail
     - More third level
2. **Back to First**
   - Clean organization
   - Easy to read

### Mixed Content

Here's a paragraph with **bold text**, *italic text*, `inline code`, and a [link](https://example.com) all together.

> And here's a blockquote that contains **formatted** text and `code`.

---

## 📈 Performance

Splitmark is optimized for speed:

- ⚡ **< 5ms** syntax highlighting per line
- 💨 **< 100ms** to highlight 1000 lines
- 💾 **< 100ms** to load 1MB files
- 🚀 **Zero** UI lag during editing

---

## 🔧 Configuration

Customize Splitmark with `~/.splitmarkrc`:

```json
{
  "defaultLocation": "~/Documents/Splitmark",
  "layout": "side",
  "showPreview": true,
  "columnWidthRatio": 75,
  "theme": {
    "editor": {
      "background": "#1e1e1e",
      "foreground": "#d4d4d4"
    }
  }
}
```

---

## 🌐 Community

- **GitHub:** [splitmark/splitmark](https://github.com/splitmark/splitmark)
- **Issues:** Report bugs and request features
- **Discussions:** Share tips and ask questions
- **Contributing:** PRs welcome!

---

## ✅ Checklist for Success

- [x] Install Node.js 18+
- [x] Install Splitmark globally
- [x] Open your first document
- [x] Try the live preview
- [x] Customize your config
- [ ] Write amazing content
- [ ] Share with the world

---

## 🎭 Final Thoughts

Splitmark brings the power of modern web technologies to the terminal. Whether you're writing documentation, taking notes, or drafting blog posts, Splitmark provides a **fast**, **focused**, and **beautiful** editing experience.

### Made with ❤️ for the terminal

*Happy writing!* ✨📝🚀
