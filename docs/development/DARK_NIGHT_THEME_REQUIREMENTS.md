# Dark Night Theme - Requirements & Specifications

## Theme Philosophy
Create a cohesive, minimalist dark theme with subtle borders and consistent use of dark charcoal (`#1e1e1e`) as the primary border/accent color, while maintaining vibrant syntax highlighting and terminal prompt colors.

## Color Palette

### Primary Colors
- **Dark Charcoal**: `#1e1e1e` - Primary border and button background color
- **Medium Gray**: `#808080` - Secondary accent (e.g., send button in Claude chat)
- **Pure Black**: `#0A0A0A` - Main background
- **Light Text**: `#E0E0E0` - Primary foreground text

### Syntax Colors (Preserved)
- Branch name: `#FFD93D` (Yellow)
- Username: `#6BCB77` (Green)
- Directory: `#4ECDC4` (Turquoise)
- Upstream: `#C792EA` (Purple)
- Synced status: `172` (Orange-red)

## Requirements

### 1. Border Unification
**Goal**: Replace ALL borders with `#1e1e1e` for consistency

**Areas to Update**:
- Panel borders (terminal, output, debug console, problems, terminal chat)
- Editor group borders
- Sidebar border
- Activity bar border
- Tab borders
- Widget borders (peek view, hover, suggest, etc.)
- Notification borders
- Input field borders
- Dropdown borders
- Menu borders
- Breadcrumb borders
- Title bar borders

**Current Values to Replace**:
- Any `#XXXXX99` alpha borders → `#1e1e1e`
- Light gray borders
- Default VS Code borders

### 2. Button Redesign
**Goal**: All buttons use `#a8aef2` background with appropriate foreground

**Button Types**:
- Primary buttons (`button.background`) - ⚠️ TODO: Change from `#808080` to `#a8aef2`
- Secondary buttons
- Extension buttons - ⚠️ TODO: Change from `#1e1e1e` to `#a8aef2`
- Status bar items
- Notification action buttons
- Quick input buttons

**Foreground Colors**:
- Active/hover: Bright color for visibility
- Disabled: Dimmed but readable

### 3. Light Gray Replacement Strategy

**Replace with `#1e1e1e`**:
- Button backgrounds
- Border colors
- Panel backgrounds (where appropriate)
- Inactive tab backgrounds (evaluate)
- Widget backgrounds (hover, peek view)

**PRESERVE (Do NOT change)**:
- Foreground text colors (maintain readability)
- Selection backgrounds
- Status bar foreground text
- Inactive/disabled text (needs to be dimmed)
- Git decoration colors
- Syntax highlighting colors

### 4. Claude Chat Integration

**Input Text Box**:
- Background: `#1e1e1e` - ✅ DONE: `chat.requestBackground`
- Border: `#a8aef2` (teal-green) - ✅ DONE: `chat.requestBorder`
- Text color: Maintain readability

**Response Blocks**:
- Border: `#1e1e1e` - ✅ DONE: `interactive.responseBorder`
- Background: `#0A0A0A` - ✅ DONE: `interactive.responseBackground`
- Code blocks: Maintain syntax highlighting

**Send Button**:
- Background: `#a8aef2` (teal-green) - ✅ DONE: `button.background`
- Foreground: `#E0E0E0` - ✅ DONE: `button.foreground`
- Hover state: `#658f82` - ✅ DONE: `button.hoverBackground`

**Additional Elements**:
- Chat background: Consistent with theme
- Message timestamps: Subtle but readable
- User vs AI message differentiation
- Hover states for messages
- Loading/typing indicators

### 5. Panels & Sections

**Terminal Panel**:
- Border between terminal and editor: `#1e1e1e`
- Terminal background: `#0A0A0A`
- Terminal foreground: `#E0E0E0`

**Sidebar**:
- Border: `#1e1e1e`
- Background: `#0A0A0A`
- Section dividers: `#1e1e1e`

**Status Bar**:
- Border: `#1e1e1e`
- Background: `#0A0A0A`
- Item backgrounds on hover: `#1e1e1e`

## Accessibility Considerations

**Contrast Ratios**:
- Text on `#1e1e1e`: Minimum 4.5:1 for normal text
- Button text: Ensure visibility
- Focus indicators: Clear and visible

**Visual Hierarchy**:
- Active vs inactive states clearly distinguishable
- Borders visible but not overpowering
- Syntax colors pop against dark background

## Testing Checklist

- [x] All panel borders display `#1e1e1e` - ✅ DONE
- [x] Terminal/editor separation visible - ✅ DONE
- [x] Primary buttons use `#a8aef2` background - ✅ DONE
- [x] Extension buttons use `#1e1e1e` background - ✅ DONE
- [x] Light gray replaced throughout (except preserved areas) - ✅ DONE
- [x] Claude chat input box styled correctly - ✅ DONE: `#1e1e1e` background, `#808080` border
- [x] Claude response blocks have `#1e1e1e` borders - ✅ DONE
- [x] Send button is `#a8aef2` - ✅ DONE
- [x] Text remains readable everywhere - ✅ DONE: `#E0E0E0` and `#FFFFFF` on dark backgrounds
- [x] Syntax highlighting preserved - ✅ DONE
- [x] Terminal prompt colors work correctly - ✅ DONE
- [ ] Focus states visible - ⚠️ IN PROGRESS: Command Palette selection
- [x] Hover states appropriate - ✅ DONE: `#a8aef2` for lists, `#9a9a9a` for buttons
- [ ] No visual regressions in any VS Code panel - ⚠️ NEEDS TESTING

## Implementation Notes

**File to Update**: `themes/colorful-carbon-dark-night.json`

**Systematic Approach**:
1. Create backup of current theme
2. Search and replace border colors
3. Update button definitions
4. Replace light gray systematically
5. Add Claude chat specific overrides
6. Test in actual VS Code environment
7. Iterate based on visual inspection

**VS Code Theme Property Groups**:
- `colors` - UI colors
- `tokenColors` - Syntax highlighting (mostly preserve)

## Implemented Changes

### UI Elements Updated (2024-11-18)

#### Borders - All set to `#1e1e1e`:
- Activity bar: `activityBar.border`, `activityBar.activeBorder`
- Sidebar: `sideBar.border`
- Tabs: `tab.activeBorder`, `tab.border`
- Status bar: `statusBar.border`, `statusBar.debuggingBackground`
- Panels: `panel.border`, `panelTitle.activeBorder`
- Editor groups: `editorGroup.border`
- Widgets: `editorWidget.border`, `editorWidget.resizeBorder`
- Menus: All menu borders
- Input fields: `input.border`
- Peek view: `peekView.border`
- Notifications: `notifications.border`, `notificationToast.border`
- Dropdowns: `dropdown.border`

#### Buttons - All: `#a8aef2`:
- Primary buttons: `#a8aef2` background, `#E0E0E0` foreground, `#658f82` hover
- Extension buttons: `#a8aef2` background, `#E0E0E0` foreground, `#658f82` hover
- Activity bar badge: `#1e1e1e` background

#### Command Palette & Lists - Selection: `#a8aef2`:
- Active selection: `list.activeSelectionBackground: #a8aef2`
- Hover: `list.hoverBackground: #a8aef2`
- Focus: `list.focusBackground: #a8aef2`
- Focus + Selection: `list.focusAndSelectionBackground: #a8aef2`
- Highlight text: `list.highlightForeground: #FFD93D`
- Filter match: `list.filterMatchBorder: #FFD93D`
- Quick input focus: `quickInputList.focusBackground: #a8aef2`

#### Claude Chat Integration:
- Input box background: `chat.requestBackground: #1e1e1e`
- Input box border: `chat.requestBorder: #a8aef2` (teal-green)
- Response background: `interactive.responseBackground: #0A0A0A`
- Response border: `interactive.responseBorder: #1e1e1e`
- Send button: `button.background: #a8aef2` (see Buttons section)

#### Widget Backgrounds - Set to `#1e1e1e`:
- Editor suggest widget
- Editor hover widget
- Quick input background: `#0A0A0A`
- Badge: `#1e1e1e`
- Toolbar hover: `#1e1e1e`
- Progress bar: `#1e1e1e`
- Editor find: borders set to `#1e1e1e`

#### Editor Gutter & Minimap:
- Gutter background: `#0A0A0A`
- Minimap background: `#0A0A0A`
- Minimap slider: `#1e1e1e` with varying opacity (40%, 60%, 80%)

#### Additional UI Elements:
- Selection highlight: `#1e1e1e80`
- Indent guides: `#1e1e1e40` (inactive), `#1e1e1e` (active)
- Editor ruler: `#1e1e1e`
- Command center active border: `#1e1e1e`

## Recent Updates (2024-11-19)

### Session Changes:
- ✅ Fixed Claude chat box background to #12171e
- ✅ Fixed Claude response backgrounds to #12171e
- ✅ Removed visible borders from Claude response blocks (editorWidget.border: #12171e)
- ✅ Fixed panel border from #808080 to #12171e (border between terminal and editor)
- ✅ Fixed panel tab backgrounds (TERMINAL, PROBLEMS, etc.) to #0A0A0A
- ✅ Fixed editor tab area background (editorGroupHeader.tabsBackground) to #0A0A0A
- ✅ Fixed OUTLINE/TIMELINE sidebar section headers:
  - Added `sideBarSectionHeader.background`: #12171e
  - Added `sideBarSectionHeader.foreground`: #E0E0E0
  - Added `sideBarSectionHeader.border`: #12171e
- ✅ Updated Claude chat text color to #bdc4c7:
  - `chat.requestForeground`: #bdc4c7
  - `interactive.responseForeground`: #bdc4c7
- ✅ Fixed Quick Pick dialog selection background to #28333a
- ✅ Fixed interactive dialog (Claude chat) selection background to #28333a:
  - `list.activeSelectionBackground`: #28333a
  - `quickInputList.focusBackground`: #28333a
- ✅ Cleaned up 34 experimental diff editor properties that didn't work
- ✅ Removed outdated backup file

### Known Limitations:
- ❌ **Diff Editor Background in Claude Chat**: The side-by-side diff editor shown in Claude Code chat responses uses a hardcoded background color (#1e1e1e) that cannot be themed via standard VS Code theme properties
  - **Tested Properties**: Attempted to theme via 20+ properties including `diffEditor.*`, `editorWidget.*`, `webview.*`, `sideBySideEditor.*`, and various panel/widget properties
  - **Conclusion**: This background is controlled by the Claude Code extension itself, not by VS Code theme files
  - **Workaround**: None available for extension authors - would require changes to Claude Code extension
  - **Impact**: Minor visual inconsistency in Claude chat diff views (shows #1e1e1e instead of desired #12171e)

## Git Tracking Issue - SOLVED ✅

**Problem**: The `dark-night` branch tracks `origin/main` instead of `origin/dark-night`

**Why it happens**: When creating a branch from `main`, git automatically sets it to track the same upstream.

**Impact**: Starship prompt shows "ahead 1 commit" when actually synced with origin/dark-night

**Solution Implemented - Automatic Detection & Fix**:
- ✅ **Automatic Fix**: Extension now automatically fixes git tracking mismatches on activation
- ✅ **Terminal Monitoring**: Checks and auto-fixes when new terminals are opened
- ✅ **Silent Operation**: Automatically fixes obvious issues without user intervention
- ✅ **Smart Notifications**: Only shows notifications for edge cases requiring user decision
- ✅ **Status Feedback**: Shows subtle status bar message when auto-fix occurs

**How Automatic Fix Works**:
1. **On Extension Activation**: Checks git tracking after 2-second delay
2. **On Terminal Creation**: Checks when user opens a new terminal (catches branch changes)
3. **Auto-Fix Logic**:
   - Detects when local branch name doesn't match configured upstream
   - Verifies remote branch with same name exists (e.g., `origin/dark-night`)
   - Automatically runs: `git branch --set-upstream-to=origin/dark-night`
   - Shows status bar message: "$(check) Git tracking fixed" for 3 seconds
4. **Fallback to Notification**: If auto-fix can't determine correct action, shows notification with options

**User Actions** (only when auto-fix uncertain):
- "Fix Tracking" - Manual confirmation to fix
- "Remind Me Later" - Check again on next activation
- "Don't Show Again" - Saves to settings (`colorfulCarbon.hideGitTrackingWarning`)

**Files Involved**:
- `src/git-helper.ts` - Auto-fix logic and git operations
- `src/extension.ts` - Integration and terminal monitoring

## Code Quality & Refactoring (2024-11-19)

### Extension Code Optimization

Applied 10x engineering principles to refactor `extension.ts`:

**Constants & Configuration**:
- Extracted magic strings to `THEME_NAMES` constant
- Extracted hardcoded delays to `DELAYS` constant
- Created `CONFIG_SECTION` constant for configuration namespace
- Created `FILE_PATHS` constant for common file paths

**Helper Functions**:
- `getColorfulCarbonConfig()` - Centralized config access
- `getCurrentThemeName()` - Get current VS Code theme
- `isColorfulCarbonTheme()` - Check if theme is Colorful Carbon variant
- `getThemeType()` - Get theme type (dark-night or default)
- `getHomeFilePath()` - Get absolute paths in home directory

**Refactored Initialization**:
- Split monolithic `activate()` into focused functions:
  - `initializeTheme()` - Theme setup and terminal settings
  - `initializeGitTracking()` - Git tracking check with error handling
  - `handleWelcomeMessage()` - Welcome message logic
  - `registerCommands()` - Command registration
  - `setupStatusBar()` - Status bar creation and updates
  - `setupThemeChangeListener()` - Theme change detection

**Improved Functions**:
- `applyTerminalConfiguration()` - Split into smaller focused functions:
  - `backupConfigs()` - Backup existing config files
  - `appendZshrcConfig()` - Safely append zshrc content
  - `writeStarshipConfig()` - Write theme-appropriate config
- `updateStarshipConfig()` - Simplified using helper functions
- `reloadAllTerminals()` - Extracted terminal reload logic
- `testExtension()` - Moved to standalone function

**Documentation**:
- Added JSDoc comments to all public functions
- Improved inline comments for clarity
- Documented parameters and return types

**Error Handling**:
- Wrapped async setTimeout callbacks in try-catch
- Added error logging with `[Colorful Carbon]` prefix
- Improved error messages for user feedback

### Git Helper Optimization

Refactored `git-helper.ts` for better separation of concerns:

**Helper Functions**:
- `isGitRepository()` - Check if in valid git repo
- `getCurrentBranch()` - Get current branch name
- `getUpstreamBranch()` - Get upstream branch configuration
- `remoteBranchExists()` - Check if remote branch exists

**Improvements**:
- Added comprehensive error logging
- Added JSDoc documentation
- Fixed function name typo (`remoteBranch Exists` → `remoteBranchExists`)
- Added `resetNotificationFlag()` for testing
- Better null handling and early returns

**Benefits**:
- Easier to test individual functions
- More maintainable code structure
- Clear single responsibility for each function
- Better error tracking with consistent logging

## Version History
- v1.3 - Code refactoring and optimization, documented known limitations (2024-11-19)
- v1.2 - Updated with session changes and correct color values (2024-11-19)
- v1.1 - Documented all implemented changes (2024-11-18)
- v1.0 - Initial requirements (2024-11-18)
