# C Outline Map

<p align="center">
  <a href="README.en.md"><img src="https://img.shields.io/badge/lang-en-blue.svg" alt="English"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/lang-zh--cn-red.svg" alt="中文"></a>
</p>

An enhanced VS Code outline view with search, keyboard navigation, shortcut jumping and real-time cursor tracking.

## Features

### 📋 Enhanced Outline List
- Retrieves symbols from VS Code's language server — works with all languages
- Uses Codicon icons matching VS Code's built-in outline
- Recursively flattened display with indentation for hierarchy
- Automatically waits for the language server to start

### 🔍 Search & Filter
- Real-time filtering: type to search, instantly locate symbols
- Case-sensitive toggle (`Aa` button)
- Fuzzy search toggle (`.*` button) — characters match in sequence
- Preview cursor auto-points to the first result after searching

### ⌨️ Keyboard Navigation
| Shortcut | Action |
|----------|--------|
| `↑/↓` | Move preview cursor, editor jumps synchronously |
| `Enter` | Confirm jump to preview position |
| `Enter` in search box | Enter shortcut mode — each item shows a number label |
| `1-9` `a-z` in shortcut mode | Jump directly to the corresponding item |

### 🎯 Editor Sync
- Outline auto-tracks and highlights the corresponding symbol as cursor moves
- Click an outline item to jump to editor and select the symbol name
- Three selection states:
  - 🔵 **Focused** (blue): when outline has focus
  - ⚪ **Unfocused** (gray): when editor has focus
  - 📌 **Preview** (left border): during arrow key navigation

### ⚡ Quick Actions
- `Alt+L` — Focus the search box

## Usage

1. Click the **Outline Map** icon in the activity bar
2. Open any code file — the sidebar shows file symbols
3. Use the search box to filter, arrow keys to navigate, Enter to jump

## Requirements

- VS Code ^1.125.0

## Known Issues

- On first file open, outline data waits for the language server to be ready — a brief delay may occur

## Release Notes

### 1.0.0

Initial release:
- Enhanced outline view
- Search & filter (case-sensitive, fuzzy match)
- Arrow key navigation and shortcut jumping
- Real-time editor cursor tracking
- Three selection states (focused / unfocused / preview)
