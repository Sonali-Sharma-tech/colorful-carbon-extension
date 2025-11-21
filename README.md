# 🎨 Colorful Carbon - Complete VS Code Makeover

Transform your entire VS Code experience with a beautiful dark theme and matching terminal colors! This extension doesn't just change your editor theme - it gives your entire development environment a complete makeover.

## ✨ Features

### 🎨 Beautiful Dark Themes
- **Colorful Carbon**: Vibrant theme with pink/blue/green palette
- **Dark Knight**: Softer variant with green/yellow/purple palette
- Carefully crafted color palettes inspired by Carbon design
- Vibrant syntax highlighting for all major languages
- Easy on the eyes for long coding sessions

### 🔄 Smart Theme Switching
- **Automatic Terminal Updates**: Terminal colors change when you switch themes
- **Auto-Reload**: Terminals automatically refresh with new theme
- **Theme-Aware Git Colors**: Git output matches your selected theme

### 🚀 Smart Git Fetch
- **Background Fetching**: Keeps your git status accurate
- **15-Minute Cache**: Intelligent caching prevents excessive fetching
- **Upstream Tracking**: See ahead/behind counts in your prompt

### 🖥️ Complete Terminal Transformation
- **Automated Setup**: One-click installation of terminal enhancements
- **Syntax Highlighting**: Commands appear in green as you type
- **Smart Git Colors**: Branch names change based on theme
- **Beautiful Prompt**: Starship prompt with git integration

### 🚀 What Gets Installed

When you run the complete makeover:
1. **Starship** - Beautiful, fast, and customizable prompt
2. **Zsh plugins** - Auto-suggestions and syntax highlighting
3. **Git colors** - Enhanced readability for git output
4. **Terminal theme** - Colors that match your VS Code theme

## 📸 Preview

### 🎨 Theme Variants

**Colorful Carbon (Default)**
![Colorful Carbon Theme](images/theme-colorful-carbon.png)

**Dark Knight**
![Dark Knight Theme](images/theme-dark-knight.png)

### 🖥️ Terminal Integration

**Before & After**
![Terminal Transformation](images/terminal-comparison.png)

### ✨ Smart Features

**Status Bar & Theme Switching**
![Smart Features](images/features-demo.gif)

## 🚀 Quick Start

1. Install the extension
2. VS Code will automatically apply the theme
3. Run **"Colorful Carbon: Apply Complete Makeover"** from Command Palette (Cmd/Ctrl+Shift+P)
4. Restart your terminal

That's it! Your entire development environment is transformed! 🎉

## 📋 Commands

Access these commands from the Command Palette (Cmd/Ctrl+Shift+P):

- **Colorful Carbon: Apply Complete Makeover** - Full automatic setup
- **Colorful Carbon: Show Setup Status** - Check what's installed
- **Colorful Carbon: Remove Terminal Configuration** - Clean removal with automatic backups

## 🎨 Color Scheme

- **Background**: Deep carbon black (#0A0A0A)
- **Foreground**: Crisp white (#D9D9D9)
- **Keywords**: Ocean blue (#6ebad7)
- **Strings**: Fresh green (#a3c679)
- **Functions**: Sky blue (#6a90d0)
- **Types**: Golden (#d5b05f)
- **Git branch**: Hot pink (#CD69C9)

## 🛠️ Manual Installation

If automatic setup doesn't work:

### macOS/Linux:
```bash
# Install Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install starship zsh-autosuggestions zsh-syntax-highlighting fzf
```

## ⚙️ Extension Settings

- `colorfulCarbon.autoApplyTerminalTheme`: Automatically apply terminal theme on activation (default: true)
- `colorfulCarbon.showWelcomeMessage`: Show welcome message with setup instructions (default: true)
- `colorfulCarbon.showStatusBar`: Show status bar when dependencies are missing (default: true)

## 🗑️ Uninstalling

Want to go back to your original setup? No problem!

### Remove Extension Only
1. Uninstall the extension from VS Code
2. Your terminal configurations remain unchanged

### Remove Terminal Configurations

**Option 1: Use the Cleanup Command (Easiest)**
1. Run **"Colorful Carbon: Remove Terminal Configuration"** from Command Palette
2. Confirm removal
3. Automatic backups created before removal
4. Restart your terminal

**Option 2: Restore from Backup**
```bash
# Find your backups (created automatically)
ls ~/.zshrc.backup*
ls ~/.config/starship.toml.backup*

# Restore originals
cp ~/.zshrc.backup-[timestamp] ~/.zshrc
cp ~/.config/starship.toml.backup-[timestamp] ~/.config/starship.toml
```

**Option 3: Remove Packages Only**
```bash
# Uninstall terminal enhancements (keeps zsh intact)
brew uninstall starship zsh-autosuggestions zsh-syntax-highlighting fzf

# Your zsh shell remains untouched!
```

**Option 4: Manual Cleanup**
- Remove the custom git function from `~/.zshrc`
- Delete `~/.config/starship.toml`
- Keep all your other zsh configurations

### What's Safe
- ✅ Your zsh shell - never modified
- ✅ Your existing aliases and functions
- ✅ Your PATH configurations
- ✅ Your command history

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue on [GitHub](https://github.com/Sonali-Sharma-tech/colorful-carbon-extension).

## 📝 License

MIT

---

**Enjoy your beautiful new coding environment!** 🎨✨