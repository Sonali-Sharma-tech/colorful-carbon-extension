# Colorful Carbon Extension - Documentation

This directory contains comprehensive documentation for developers, contributors, and those wanting to reuse components in other projects.

## 📖 For Users

See the [main README](../README.md) for installation and usage instructions.

---

## 🏗️ Architecture & Design

Technical documentation for understanding and reusing core components:

- **[Git Smart Fetch](./architecture/GIT_SMART_FETCH.md)** - Intelligent background git synchronization system
  - **Reusable**: Can be integrated into any terminal prompt or shell framework
  - Complete implementation guide with code examples
  - Performance benchmarks and safety features
  - Integration guide for Starship, Oh-My-Posh, Powerlevel10k

---

## 🔧 Development Documentation

Internal documentation for maintaining and optimizing the extension:

- **[Dark Knight Theme Requirements](./development/DARK_NIGHT_THEME_REQUIREMENTS.md)**
  - Theme philosophy and color palette
  - Requirements and implementation checklist
  - Version history and completed features
  - Known limitations

- **[Performance Optimization](./development/PERFORMANCE_OPTIMIZATION.md)**
  - Step-by-step optimization plan
  - Before/after comparisons
  - Performance gains and testing strategy

- **[Optimization Summary](./development/OPTIMIZATION_SUMMARY.md)**
  - High-level overview of all optimizations
  - File structure comparisons
  - Performance metrics
  - Recommended action plan

- **[Theme Property Analysis](./development/THEME_PROPERTY_ANALYSIS.md)**
  - Analysis of 66 extra properties in dark-knight theme
  - What to keep vs remove
  - Impact assessment

---

## 🧪 Testing & Scripts

Utilities for testing and development:

- **[test-mismatch-scenario.sh](./scripts/test-mismatch-scenario.sh)**
  - Creates git upstream mismatch test scenarios
  - Tests terminal prompt display for edge cases

---

## 📚 How to Use This Documentation

### For Extension Development
All docs are in the same repository as the code, so they stay in sync:
```bash
# Make code changes
git add src/extension.ts

# Update relevant docs
git add docs/architecture/GIT_SMART_FETCH.md

# Commit together (atomic)
git commit -m "Add feature X with documentation"
```

### For Reusing Components
Components like Git Smart Fetch can be used in other projects:

```bash
# Option 1: Copy the documentation
cp docs/architecture/GIT_SMART_FETCH.md ~/my-terminal-app/docs/

# Option 2: Reference it directly
# Link to: https://github.com/you/vscode-ext/blob/main/docs/architecture/GIT_SMART_FETCH.md
```

### For Contributors
1. Read [main README](../README.md) for setup
2. Check relevant architecture docs before making changes
3. Update docs when changing features
4. Run tests using scripts in `docs/scripts/`

---

## 📝 Documentation Standards

When adding new documentation:

- **Architecture docs**: Put in `architecture/` if reusable/foundational
- **Development docs**: Put in `development/` if internal/temporary
- **Scripts**: Put in `scripts/` if executable

Keep docs:
- ✅ Up-to-date with code
- ✅ Clear and concise
- ✅ With code examples
- ✅ With testing instructions

---

## 🔗 Quick Links

- [Extension Source Code](../src/)
- [Themes](../themes/)
- [Package Manifest](../package.json)
- [Main README](../README.md)
- [Changelog](../CHANGELOG.md)

---

**Last Updated**: 2025-11-20
