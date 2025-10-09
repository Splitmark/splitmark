import TerminalRenderer from 'marked-terminal';
import chalk from 'chalk';
import { highlight as cliHighlight } from 'cli-highlight';
import hljs from 'highlight.js';

// Force color support for chalk/cli-highlight
process.env.FORCE_COLOR = '3';

/**
 * Custom Terminal Renderer that extends marked-terminal
 * to provide better code block handling with borders and language labels
 */
export default class CustomTerminalRenderer extends TerminalRenderer {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Apply VSCode-quality syntax highlighting using highlight.js
   * and manually apply chalk colors to match VSCode theme
   */
  highlightCode(code, lang) {
    if (!code) return code;

    try {
      // Use highlight.js for tokenization
      let result;
      if (lang && hljs.getLanguage(lang)) {
        result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
      } else {
        result = hljs.highlightAuto(code);
      }

      // Manually apply VSCode-like colors using chalk
      let highlighted = result.value;

      // Helper to decode HTML entities
      const decodeHTML = (html) => {
        return html
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#x60;/g, '`');
      };

      // Replace highlight.js HTML classes with chalk colors
      highlighted = highlighted
        .replace(/<span class="hljs-keyword">([^<]+)<\/span>/g, (_, text) => chalk.hex('#C586C0')(decodeHTML(text))) // Purple
        .replace(/<span class="hljs-built_in">([^<]+)<\/span>/g, (_, text) => chalk.hex('#4EC9B0')(decodeHTML(text))) // Cyan
        .replace(/<span class="hljs-type">([^<]+)<\/span>/g, (_, text) => chalk.hex('#4EC9B0')(decodeHTML(text))) // Cyan
        .replace(/<span class="hljs-literal">([^<]+)<\/span>/g, (_, text) => chalk.hex('#569CD6')(decodeHTML(text))) // Blue
        .replace(/<span class="hljs-number">([^<]+)<\/span>/g, (_, text) => chalk.hex('#B5CEA8')(decodeHTML(text))) // Light green
        .replace(/<span class="hljs-string">([^<]+)<\/span>/g, (_, text) => chalk.hex('#CE9178')(decodeHTML(text))) // Orange
        .replace(/<span class="hljs-regexp">([^<]+)<\/span>/g, (_, text) => chalk.hex('#D16969')(decodeHTML(text))) // Red
        .replace(/<span class="hljs-symbol">([^<]+)<\/span>/g, (_, text) => chalk.hex('#569CD6')(decodeHTML(text))) // Blue
        .replace(/<span class="hljs-class">([^<]+)<\/span>/g, (_, text) => chalk.hex('#4EC9B0')(decodeHTML(text))) // Cyan
        .replace(/<span class="hljs-function">([^<]+)<\/span>/g, (_, text) => chalk.hex('#DCDCAA')(decodeHTML(text))) // Yellow
        .replace(/<span class="hljs-title">([^<]+)<\/span>/g, (_, text) => chalk.hex('#DCDCAA')(decodeHTML(text))) // Yellow
        .replace(/<span class="hljs-name">([^<]+)<\/span>/g, (_, text) => chalk.hex('#4EC9B0')(decodeHTML(text))) // Cyan
        .replace(/<span class="hljs-params">([^<]+)<\/span>/g, (_, text) => chalk.hex('#9CDCFE')(decodeHTML(text))) // Light blue
        .replace(/<span class="hljs-comment">([^<]+)<\/span>/g, (_, text) => chalk.hex('#6A9955')(decodeHTML(text))) // Green
        .replace(/<span class="hljs-doctag">([^<]+)<\/span>/g, (_, text) => chalk.hex('#6A9955')(decodeHTML(text))) // Green
        .replace(/<span class="hljs-meta">([^<]+)<\/span>/g, (_, text) => chalk.hex('#808080')(decodeHTML(text))) // Gray
        .replace(/<span class="hljs-attr">([^<]+)<\/span>/g, (_, text) => chalk.hex('#9CDCFE')(decodeHTML(text))) // Light blue
        .replace(/<span class="hljs-attribute">([^<]+)<\/span>/g, (_, text) => chalk.hex('#9CDCFE')(decodeHTML(text))) // Light blue
        .replace(/<span class="hljs-variable">([^<]+)<\/span>/g, (_, text) => chalk.hex('#9CDCFE')(decodeHTML(text))) // Light blue
        .replace(/<span class="hljs-tag">([^<]+)<\/span>/g, (_, text) => chalk.hex('#569CD6')(decodeHTML(text))) // Blue
        .replace(/<span class="hljs-selector-tag">([^<]+)<\/span>/g, (_, text) => chalk.hex('#D7BA7D')(decodeHTML(text))) // Gold
        .replace(/<span class="hljs-selector-id">([^<]+)<\/span>/g, (_, text) => chalk.hex('#D7BA7D')(decodeHTML(text))) // Gold
        .replace(/<span class="hljs-selector-class">([^<]+)<\/span>/g, (_, text) => chalk.hex('#D7BA7D')(decodeHTML(text))) // Gold
        // Remove any remaining HTML tags
        .replace(/<[^>]+>/g, '');

      // Decode any remaining HTML entities
      highlighted = decodeHTML(highlighted);

      return highlighted;
    } catch (error) {
      // Fallback to plain code if highlighting fails
      return code;
    }
  }

  /**
   * Override code block rendering to add borders and language labels
   */
  code(code, lang, escaped) {
    // Handle object format (newer marked versions)
    if (typeof code === 'object') {
      lang = code.lang;
      escaped = !!code.escaped;
      code = code.text;
    }

    // Handle empty code
    if (!code) {
      code = '';
    }

    // Apply syntax highlighting
    const highlightedCode = this.highlightCode(code, lang);

    // Split into lines
    const lines = highlightedCode.split('\n');

    // Remove trailing empty line if present
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    // Determine language label
    const language = lang || 'code';

    // Get preview width from options (will be set dynamically)
    const previewWidth = this.o.previewWidth || 70;

    // Calculate width - measure actual content width (accounting for ANSI codes)
    const contentWidth = Math.max(
      ...lines.map(line => {
        try {
          return this.stripAnsi(line).length;
        } catch (e) {
          return line.length;
        }
      }),
      language.length + 2,
      10
    );

    // Set box width based on preview width (leave room for borders and padding)
    const maxWidth = Math.max(previewWidth - 6, 20); // Minimum 20 chars
    const boxWidth = Math.min(contentWidth + 2, maxWidth);

    // Build clean code block with subtle styling (VSCode-like)
    // Language label in dim gray
    const langLabel = language !== 'code' ? chalk.dim(`# ${language}`) : '';

    // Add subtle background using box-drawing characters and dimmed borders
    const topBorder = chalk.dim('┌' + '─'.repeat(Math.min(boxWidth + 2, maxWidth)) + '┐');
    const bottomBorder = chalk.dim('└' + '─'.repeat(Math.min(boxWidth + 2, maxWidth)) + '┘');

    // Format code lines with left/right borders for "background" effect
    const codeLines = lines.map(line => {
      const visualLength = this.stripAnsi(line).length;
      const trimmedLine = visualLength > boxWidth ? line.substring(0, boxWidth) : line;
      const padding = ' '.repeat(Math.max(0, boxWidth - visualLength));
      return chalk.dim('│ ') + trimmedLine + padding + chalk.dim(' │');
    });

    // Assemble the code block with minimal decoration
    const parts = ['\n'];
    if (langLabel) parts.push(langLabel, '\n');
    parts.push(topBorder, '\n');
    parts.push(codeLines.join('\n'));
    parts.push('\n', bottomBorder, '\n');

    return parts.join('');
  }

  /**
   * Override heading rendering to use different visual sizes
   */
  heading(text, level) {
    // Handle object format (newer marked versions)
    if (typeof text === 'object') {
      level = text.depth;
      text = text.text;
    }

    // Strip text length for underlines (account for ANSI codes)
    const textLength = this.stripAnsi(text).length;

    // Use different styles for different heading levels (VSCode-like)
    switch (level) {
      case 1:
        // H1: Largest - bold white, simple and clean
        return '\n' + chalk.bold.white(text) + '\n';

      case 2:
        // H2: Bold white with subtle underline
        return '\n' + chalk.bold.white(text) + '\n' + chalk.gray('─'.repeat(textLength)) + '\n';

      case 3:
        // H3: Bold white
        return '\n' + chalk.bold.white(text) + '\n';

      case 4:
        // H4: Bold, slightly dimmed
        return '\n' + chalk.bold(text) + '\n';

      case 5:
        // H5: Bold, slightly dimmed
        return '\n' + chalk.bold(text) + '\n';

      case 6:
        // H6: Dimmed
        return '\n' + chalk.dim(text) + '\n';

      default:
        return '\n' + chalk.bold(text) + '\n';
    }
  }

  /**
   * Helper to strip ANSI color codes for length calculation
   */
  stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[.*?m/g, '');
  }
}
