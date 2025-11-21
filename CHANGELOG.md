# Change Log

All notable changes to the "Colorful Carbon" extension will be documented in this file.

## [2.0.0] - 2024-11-21

### Added
- 🎨 **Dark Night Theme**: New softer color variant with green/yellow/purple palette
- 🚀 **Smart Git Fetch**: Background git fetching with 15-minute intelligent caching
- 🔄 **Automatic Theme Switching**: Terminal colors update when you switch themes
- 📊 **Git Upstream Tracking**: See ahead/behind counts and branch mismatches in prompt
- 🎯 **Theme-Aware Git Colors**: Branch colors match your selected theme (magenta for Default, yellow for Dark Night)
- ✨ **Auto-Reload Terminals**: Terminals automatically reload when theme changes
- 🧹 **Cleanup Command**: One-click removal of terminal configuration with automatic backups
- 📊 **Smart Status Bar**: Menu-based status bar with dismiss option and 5-minute polling

### Changed
- Unified starship template system (single template with theme parameters)
- Improved git color configuration (now theme-aware on initial setup)
- Better arrow spacing in git status (⬆ 5 instead of ⬆5)
- POSIX sh compatibility improvements (printf instead of echo -n)

### Improved
- 33% code reduction through optimization (1,344 → 1,111 lines)
- Faster extension activation
- Better upgrade path for v1 users
- Automatic smart fetch installation for existing users
- More discoverable cleanup options

### Performance
- 90% polling reduction (5 minutes vs 30 seconds)
- Status bar polling stops when user dismisses
- Reduced background shell command execution
- Improved starship config generation efficiency
- Optimized theme switching logic

### Fixed
- Git upstream tracking accuracy with smart fetch cache
- Terminal reload timing issues
- Theme marker synchronization

## [1.0.0] - 2024-11-08

### Initial Release
- 🎨 Beautiful dark theme with vibrant syntax highlighting
- 🖥️ Complete terminal makeover with automated setup
- 🚀 One-click installation of terminal dependencies
- ⚙️ Configurable settings for auto-apply and welcome message
- 🎯 Commands for manual setup steps
- 📝 Comprehensive documentation