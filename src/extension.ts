import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { isManualSwitch } from './theme-switcher';

// Constants
const THEME_NAMES = {
    DEFAULT: 'Colorful Carbon',
    DARK_NIGHT: 'Colorful Carbon Dark Night'
} as const;

const DELAYS = {
    WELCOME_MESSAGE: 1000,
    SETUP_REMINDER: 2000,
    THEME_CONFIG_WRITE: 100
} as const;

const CONFIG_SECTION = 'colorfulCarbon';

const FILE_PATHS = {
    ZSHRC: '.zshrc',
    STARSHIP_CONFIG: path.join('.config', 'starship.toml'),
    THEME_MARKER: '.colorful-carbon-theme',
    INSTALL_MARKER: path.join('.config', '.colorful-carbon-installed')
} as const;

// Helper: Get Colorful Carbon configuration
function getColorfulCarbonConfig() {
    return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

// Helper: Get current theme name
function getCurrentThemeName(): string | undefined {
    return vscode.workspace.getConfiguration().get<string>('workbench.colorTheme');
}

// Helper: Check if theme is a Colorful Carbon theme
function isColorfulCarbonTheme(themeName: string | undefined): boolean {
    return themeName === THEME_NAMES.DEFAULT || themeName === THEME_NAMES.DARK_NIGHT;
}

// Helper: Get theme type from theme name
function getThemeType(themeName: string): 'dark-night' | 'default' {
    return themeName === THEME_NAMES.DARK_NIGHT ? 'dark-night' : 'default';
}

// Helper: Get absolute file path in home directory
function getHomeFilePath(relativePath: string): string {
    return path.join(os.homedir(), relativePath);
}

/**
 * Initialize theme - apply terminal settings and update starship config if using our theme
 */
async function initializeTheme(config: vscode.WorkspaceConfiguration): Promise<void> {
    // Auto-apply terminal theme on activation
    if (config.get('autoApplyTerminalTheme')) {
        applyTerminalSettings();
    }

    // Update starship config if user is using one of our themes
    const currentTheme = getCurrentThemeName();
    if (currentTheme && isColorfulCarbonTheme(currentTheme)) {
        await updateStarshipConfig(currentTheme);
    }
}


/**
 * Handle welcome message display based on activation state
 */
async function handleWelcomeMessage(
    context: vscode.ExtensionContext,
    config: vscode.WorkspaceConfiguration
): Promise<void> {
    const isFirstActivation = context.globalState.get('colorfulCarbon.firstActivation', true);
    const setupDismissed = context.globalState.get('colorfulCarbon.setupDismissed', false);
    const showWelcome = config.get('showWelcomeMessage', true);

    if (!showWelcome) {
        return;
    }

    if (isFirstActivation) {
        // Mark as not first activation anymore
        await context.globalState.update('colorfulCarbon.firstActivation', false);
        // Delay slightly to ensure theme is applied first
        setTimeout(() => {
            showWelcomeMessage(context).catch(error => {
                console.error('[Colorful Carbon] Error showing welcome message:', error);
            });
        }, DELAYS.WELCOME_MESSAGE);
    } else if (!setupDismissed) {
        // Check if there are still missing dependencies
        const missingDeps = await checkMissingDependencies();
        if (missingDeps.length > 0) {
            setTimeout(() => {
                showWelcomeMessage(context).catch(error => {
                    console.error('[Colorful Carbon] Error showing setup reminder:', error);
                });
            }, DELAYS.SETUP_REMINDER);
        }
    }
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
    const commands = [
        vscode.commands.registerCommand('colorful-carbon.applyCompleteSetup', runCompleteSetup),
        vscode.commands.registerCommand('colorful-carbon.installTerminalDependencies', installTerminalDependencies),
        vscode.commands.registerCommand('colorful-carbon.applyTerminalConfig', applyTerminalConfiguration),
        vscode.commands.registerCommand('colorful-carbon.showSetupStatus', showSetupStatus),
        vscode.commands.registerCommand('colorful-carbon.removeTerminalConfig', removeTerminalConfiguration),
        vscode.commands.registerCommand('colorful-carbon.testExtension', testExtension)
    ];

    context.subscriptions.push(...commands);
}

/**
 * Debug test command - shows extension status
 */
async function testExtension(): Promise<void> {
    const config = getColorfulCarbonConfig();
    const currentTheme = getCurrentThemeName();
    const missingDeps = await checkMissingDependencies();

    const message = `Colorful Carbon Test Results: Extension Active: ✓ | Current Theme: ${currentTheme} | Auto Apply Terminal: ${config.get('autoApplyTerminalTheme')} | Show Welcome: ${config.get('showWelcomeMessage')} | Missing Dependencies: ${missingDeps.length === 0 ? 'None' : missingDeps.join(', ')}`;

    vscode.window.showInformationMessage(message);
}

/**
 * Setup theme change listener with automatic terminal reload
 */
function setupThemeChangeListener(context: vscode.ExtensionContext): void {
    let lastAppliedTheme: string | undefined;

    context.subscriptions.push(
        vscode.window.onDidChangeActiveColorTheme(async () => {
            // Skip if manual theme switch is in progress to prevent double execution
            if (isManualSwitch()) {
                return;
            }

            // Small delay to ensure config is fully written
            await new Promise(resolve => setTimeout(resolve, DELAYS.THEME_CONFIG_WRITE));

            const themeName = getCurrentThemeName();

            if (isColorfulCarbonTheme(themeName)) {
                // Only update if theme actually changed
                if (lastAppliedTheme !== themeName) {
                    lastAppliedTheme = themeName;

                    // Update starship config based on theme
                    await updateStarshipConfig(themeName!);

                    // Small delay to ensure file system flush completes
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Automatically reload all existing terminals
                    reloadAllTerminals();
                }
            } else {
                // Clear last applied theme when switching away from Colorful Carbon themes
                lastAppliedTheme = undefined;
            }
        })
    );
}

/**
 * Reload all active terminals
 */
function reloadAllTerminals(): void {
    if (vscode.window.terminals.length > 0) {
        vscode.window.terminals.forEach(terminal => {
            // Use exec zsh to start fresh shell with new config
            // Don't clear screen to preserve command history context
            terminal.sendText('exec zsh', true);
        });
    }
}


/**
 * Setup status bar with periodic updates
 */
function setupStatusBar(context: vscode.ExtensionContext): void {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    updateStatusBar(statusBarItem);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Update status bar periodically (every 30 seconds)
    const statusInterval = setInterval(() => updateStatusBar(statusBarItem), 30000);
    context.subscriptions.push({ dispose: () => clearInterval(statusInterval) });
}

/**
 * Update status bar text based on missing dependencies
 */
async function updateStatusBar(statusBarItem: vscode.StatusBarItem): Promise<void> {
    const missingDeps = await checkMissingDependencies();

    if (missingDeps.length === 0) {
        statusBarItem.text = "$(check) Colorful Carbon";
        statusBarItem.tooltip = "All components installed";
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = `$(warning) Colorful Carbon (${missingDeps.length} missing)`;
        statusBarItem.tooltip = `Missing: ${missingDeps.join(', ')}\nClick to install`;
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }

    statusBarItem.command = 'colorful-carbon.showSetupStatus';
}

/**
 * Install smart fetch feature to user's .zshrc
 */
async function installSmartFetch(): Promise<void> {
    const zshrcPath = getHomeFilePath(FILE_PATHS.ZSHRC);
    const content = fs.readFileSync(zshrcPath, 'utf8');

    if (content.includes('__colorful_carbon_fetch')) {
        return; // Already installed
    }

    const smartFetchBlock = `# Colorful Carbon: Smart Git Auto-Fetch (opt-out: COLORFUL_CARBON_DISABLE_AUTOFETCH=1)
if [[ -z "$COLORFUL_CARBON_DISABLE_AUTOFETCH" ]]; then
  function __colorful_carbon_fetch() {
    # LAYER 1: Quick exit if not in git repo (~5ms)
    git rev-parse --git-dir >/dev/null 2>&1 || return

    # LAYER 2: Get repo root and hash (~10ms)
    local repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
    [[ -z "$repo_root" ]] && return

    local cache_dir="$HOME/.git-fetch-cache"
    local hash=$(echo -n "$repo_root" | shasum -a 256 2>/dev/null | cut -d' ' -f1)
    [[ -z "$hash" ]] && return

    local cache_file="$cache_dir/$hash"

    # LAYER 3: Quick cache age check (~5ms) - Exit early if fresh
    local last_fetch=0
    [[ -f "$cache_file" ]] && last_fetch=$(cat "$cache_file" 2>/dev/null || echo 0)
    local now=$(date +%s)
    local age=$((now - last_fetch))

    [[ $age -lt 900 ]] && return  # Cache fresh, exit early

    # LAYER 4: Only now do expensive operations
    local lock_file="$cache_file.lock"
    [[ -f "$lock_file" ]] && return  # Already fetching

    mkdir -p "$cache_dir" 2>/dev/null || return
    find "$cache_dir" -type f -not -name "*.lock" -mtime +30 -delete 2>/dev/null || true

    touch "$lock_file" 2>/dev/null || return
    (
      if git fetch --quiet --all --prune --tags 2>/dev/null; then
        echo $now > "$cache_file"
      fi
      rm -f "$lock_file"
    ) &!
  }

  if [[ ! " \${chpwd_functions[@]} " =~ " __colorful_carbon_fetch " ]]; then
    chpwd_functions+=(__colorful_carbon_fetch)
  fi
  if [[ ! " \${preexec_functions[@]} " =~ " __colorful_carbon_fetch " ]]; then
    preexec_functions+=(__colorful_carbon_fetch)
  fi
  __colorful_carbon_fetch
fi

`;

    const updatedContent = content.replace(
        /# Initialize Starship prompt/,
        `${smartFetchBlock}# Initialize Starship prompt`
    );

    fs.writeFileSync(zshrcPath, updatedContent);
}

/**
 * Ensure existing users get latest terminal configuration updates
 * Auto-upgrades if autoApplyTerminalTheme is enabled, shows notification otherwise
 */
async function ensureLatestTerminalConfig(context: vscode.ExtensionContext): Promise<void> {
    const zshrcPath = getHomeFilePath(FILE_PATHS.ZSHRC);

    if (!fs.existsSync(zshrcPath)) {
        return; // User hasn't set up terminal yet
    }

    const content = fs.readFileSync(zshrcPath, 'utf8');

    // Only proceed if user has already opted-in
    if (!content.includes('# Colorful Carbon Configuration - START')) {
        return; // User never ran setup - respect their choice
    }

    const config = getColorfulCarbonConfig();
    const autoApply = config.get('autoApplyTerminalTheme', true);

    // Check if smart fetch is missing (new feature in v1.1)
    if (!content.includes('__colorful_carbon_fetch')) {
        if (autoApply) {
            // User has auto-apply enabled - upgrade silently
            await installSmartFetch();
        } else {
            // User prefers manual control - show notification
            const hasPrompted = context.globalState.get('smartFetchUpgradePrompted', false);

            if (!hasPrompted) {
                const choice = await vscode.window.showInformationMessage(
                    '🎯 New: Smart Git Fetch - Keeps terminal git status accurate. Enable?',
                    'Enable',
                    'Not Now'
                );

                await context.globalState.update('smartFetchUpgradePrompted', true);

                if (choice === 'Enable') {
                    await installSmartFetch();
                    vscode.window.showInformationMessage('✅ Smart Git Fetch enabled! Open a new terminal to see it in action.');
                }
            }
        }
    }

    // Always update starship config to latest (idempotent)
    const currentTheme = getCurrentThemeName();
    if (currentTheme && isColorfulCarbonTheme(currentTheme)) {
        await updateStarshipConfig(currentTheme);
    }
}

/**
 * Extension activation - initializes theme, git tracking, and UI components
 */
export async function activate(context: vscode.ExtensionContext) {
    // Setup theme change listener FIRST (most critical for theme switching)
    setupThemeChangeListener(context);

    const config = getColorfulCarbonConfig();

    // Ensure existing users get latest terminal config updates
    await ensureLatestTerminalConfig(context);

    // Initialize terminal theme
    await initializeTheme(config);

    // Show welcome message if needed
    await handleWelcomeMessage(context, config);

    // Register all commands
    registerCommands(context);

    // Setup status bar
    setupStatusBar(context);
}

/**
 * Apply terminal settings to VS Code workspace
 */
function applyTerminalSettings(): void {
    const config = vscode.workspace.getConfiguration();

    // Apply terminal colors that match our theme
    const terminalSettings = {
        "terminal.integrated.fontFamily": "MesloLGS NF, SF Mono, Monaco, 'Courier New', monospace",
        "terminal.integrated.fontSize": 13,
        "terminal.integrated.lineHeight": 1.2,
        "terminal.integrated.cursorStyle": "line",
        "terminal.integrated.cursorBlinking": true,
        "workbench.colorTheme": "Colorful Carbon"
    };

    Object.entries(terminalSettings).forEach(([key, value]) => {
        config.update(key, value, vscode.ConfigurationTarget.Global);
    });
}

/**
 * Show welcome message with setup options
 */
async function showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
    // Check what's missing
    const missingDeps = await checkMissingDependencies();
    const hasAllDeps = missingDeps.length === 0;

    let message: string;
    let actions: string[];

    if (hasAllDeps) {
        message = "🎨 Colorful Carbon theme applied! Your terminal is fully configured.";
        actions = ['View Status', 'Close'];
    } else {
        message = `🎨 Colorful Carbon theme applied! Complete your terminal makeover? (${missingDeps.length} tools missing)`;
        actions = ['Install Missing Tools', 'View What\'s Missing', 'Later'];
    }

    const selection = await vscode.window.showInformationMessage(message, ...actions);

    switch (selection) {
        case 'Install Missing Tools':
            await runCompleteSetup();
            break;
        case 'View What\'s Missing':
        case 'View Status':
            await showSetupStatus();
            break;
        case 'Later':
            // Remember user chose later
            context.globalState.update('colorfulCarbon.setupDismissed', true);
            break;
    }
}

/**
 * Check for missing terminal dependencies
 */
async function checkMissingDependencies(): Promise<string[]> {
    const missing: string[] = [];

    // Check commands that should be in PATH
    const commands = ['starship', 'fzf'];
    commands.forEach(cmd => {
        try {
            execSync(`which ${cmd}`, { stdio: 'ignore' });
        } catch {
            missing.push(cmd);
        }
    });

    // Check brew packages (more reliable for plugins)
    const brewPackages = ['zsh-autosuggestions', 'zsh-syntax-highlighting'];
    brewPackages.forEach(pkg => {
        try {
            execSync(`brew list ${pkg}`, { stdio: 'ignore' });
        } catch {
            missing.push(pkg);
        }
    });

    return missing;
}

/**
 * Run complete setup with progress notification
 */
async function runCompleteSetup(): Promise<void> {
    const steps = [
        { message: 'Checking system requirements...', action: checkRequirements },
        { message: 'Installing terminal dependencies...', action: installTerminalDependencies },
        { message: 'Applying terminal configuration...', action: applyTerminalConfiguration },
        { message: 'Setting up Git colors...', action: setupGitColors },
        { message: 'Finalizing setup...', action: finalizeSetup }
    ];

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Applying Colorful Carbon Makeover",
        cancellable: false
    }, async (progress) => {
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            progress.report({
                increment: (100 / steps.length),
                message: step.message
            });

            try {
                await step.action();
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Setup failed: ${step.message}\n${errorMsg}`);
                return;
            }
        }
    });

    vscode.window.showInformationMessage(
        '✨ Colorful Carbon makeover complete! Please restart your terminal for all changes to take effect.',
        'Restart VS Code'
    ).then(selection => {
        if (selection === 'Restart VS Code') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    });
}

/**
 * Check system requirements (platform and zsh)
 */
async function checkRequirements(): Promise<void> {
    const platform = os.platform();
    if (platform !== 'darwin' && platform !== 'linux') {
        throw new Error('This extension currently supports macOS and Linux only');
    }

    // Check for zsh
    try {
        execSync('which zsh', { stdio: 'ignore' });
    } catch {
        throw new Error('Zsh is not installed. Please install zsh first.');
    }
}

/**
 * Install terminal dependencies via Homebrew
 */
async function installTerminalDependencies(): Promise<void> {
    try {
        // Check if Homebrew is installed
        execSync('which brew', { stdio: 'ignore' });
    } catch {
        const install = await vscode.window.showWarningMessage(
            'Homebrew is not installed. Would you like to install it?',
            'Yes', 'No'
        );
        if (install !== 'Yes') {
            throw new Error('Homebrew is required for automatic setup');
        }

        // Install Homebrew
        const terminal = vscode.window.createTerminal('Install Homebrew');
        terminal.sendText('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        terminal.show();

        await vscode.window.showInformationMessage(
            'Please complete Homebrew installation in the terminal, then run the setup again.'
        );
        throw new Error('Please install Homebrew first');
    }

    // Install required packages
    const packages = ['starship', 'zsh-autosuggestions', 'zsh-syntax-highlighting', 'fzf'];
    const terminal = vscode.window.createTerminal({
        name: 'Colorful Carbon Setup',
        message: 'Installing terminal dependencies...'
    });

    // Create a single command to check and install all packages
    const installCommand = packages
        .map(pkg => `brew list ${pkg} &>/dev/null || brew install ${pkg}`)
        .join(' && ');

    terminal.sendText(installCommand);
    terminal.show();

    // Give user feedback
    vscode.window.setStatusBarMessage('Installing terminal dependencies...', 5000);
}

/**
 * Apply terminal configuration - backup existing configs and write new ones
 */
async function applyTerminalConfiguration(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Backup existing configs
    backupConfigs(timestamp);

    // Ensure .config directory exists
    const configDir = getHomeFilePath('.config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Append zshrc configuration if not already present
    appendZshrcConfig();

    // Ensure smart fetch is installed (even if user clicked "Not Now" before)
    await installSmartFetch();

    // Write starship config and theme marker based on current theme
    writeStarshipConfig();
}

/**
 * Backup configuration files before modification
 */
function backupConfigs(timestamp: string): void {
    const configs = [FILE_PATHS.ZSHRC, FILE_PATHS.STARSHIP_CONFIG];

    configs.forEach(config => {
        const configPath = getHomeFilePath(config);
        if (fs.existsSync(configPath)) {
            const backupPath = `${configPath}.backup-${timestamp}`;
            fs.copyFileSync(configPath, backupPath);
        }
    });
}

/**
 * Append Colorful Carbon configuration to .zshrc if not already present
 */
function appendZshrcConfig(): void {
    const zshrcPath = getHomeFilePath(FILE_PATHS.ZSHRC);
    const existingZshrc = fs.existsSync(zshrcPath) ? fs.readFileSync(zshrcPath, 'utf8') : '';

    // Check if our config is already present
    if (!existingZshrc.includes('# Colorful Carbon Configuration')) {
        const zshrcAdditions = `

# Colorful Carbon Configuration - START
# Added by Colorful Carbon VS Code Extension
${getZshrcContent()}
# Colorful Carbon Configuration - END
`;
        fs.appendFileSync(zshrcPath, zshrcAdditions);
    }
}

/**
 * Write starship config and theme marker file based on current theme
 */
function writeStarshipConfig(): void {
    const currentTheme = getCurrentThemeName();
    const themeType = getThemeType(currentTheme || THEME_NAMES.DEFAULT);
    const starshipContent = themeType === 'dark-night' ? getDarkNightStarshipContent() : getStarshipContent();

    fs.writeFileSync(getHomeFilePath(FILE_PATHS.STARSHIP_CONFIG), starshipContent);
    fs.writeFileSync(getHomeFilePath(FILE_PATHS.THEME_MARKER), themeType);
}

/**
 * Setup Git color configuration based on theme
 */
async function setupGitColorsForTheme(themeType: 'default' | 'dark-night'): Promise<void> {
    // Theme-specific colors
    const branchColor = themeType === 'dark-night' ? 'yellow bold' : 'magenta bold';
    const addedChangesColor = themeType === 'dark-night' ? 'magenta bold' : 'green';

    const gitCommands = [
        ['color.ui', 'auto'],
        ['color.status', 'always'],
        ['color.status.branch', branchColor],
        ['color.status.localBranch', branchColor],
        ['color.status.remoteBranch', branchColor],
        ['color.status.header', 'normal'],
        ['color.status.added', addedChangesColor],
        ['color.status.updated', addedChangesColor],
        ['color.status.changed', 'normal'],
        ['color.status.untracked', 'yellow'],
        ['color.status.deleted', 'red'],
        ['color.diff.meta', 'bold yellow'],
        ['color.diff.frag', 'magenta bold'],
        ['color.diff.old', 'red'],
        ['color.diff.new', 'green'],
        ['color.branch.current', branchColor],
        ['color.branch.local', branchColor],
        ['color.branch.remote', branchColor],
        ['color.decorate.branch', themeType === 'dark-night' ? 'yellow' : 'magenta']
    ];

    let failedCommands = 0;

    gitCommands.forEach(([key, value]) => {
        try {
            execSync(`git config --global ${key} "${value}"`);
        } catch {
            failedCommands++;
        }
    });

    if (failedCommands > 0) {
        vscode.window.showWarningMessage(`Some Git color settings could not be applied (${failedCommands} failed)`);
    }
}

/**
 * Setup Git color configuration for better terminal output (initial setup)
 */
async function setupGitColors(): Promise<void> {
    // Use default theme colors for initial setup
    await setupGitColorsForTheme('default');
}

/**
 * Finalize setup - apply VS Code settings and create completion marker
 */
async function finalizeSetup(): Promise<void> {
    // Apply VS Code settings
    applyTerminalSettings();

    // Create a setup completion marker
    const markerPath = getHomeFilePath(FILE_PATHS.INSTALL_MARKER);
    fs.writeFileSync(markerPath, new Date().toISOString());
}

/**
 * Show setup status in quick pick dialog
 */
async function showSetupStatus(): Promise<void> {
    const items: string[] = [];

    // Check theme
    const currentTheme = getCurrentThemeName();
    items.push(`✓ Theme: ${currentTheme === THEME_NAMES.DEFAULT || currentTheme === THEME_NAMES.DARK_NIGHT ? '✅ Applied' : '❌ Not applied'}`);

    // Check commands in PATH
    const commands = ['starship', 'fzf'];
    commands.forEach(cmd => {
        try {
            execSync(`which ${cmd}`, { stdio: 'ignore' });
            items.push(`✓ ${cmd}: ✅ Installed`);
        } catch {
            items.push(`✓ ${cmd}: ❌ Not installed`);
        }
    });

    // Check brew packages
    const brewPackages = ['zsh-autosuggestions', 'zsh-syntax-highlighting'];
    brewPackages.forEach(pkg => {
        try {
            execSync(`brew list ${pkg}`, { stdio: 'ignore' });
            items.push(`✓ ${pkg}: ✅ Installed`);
        } catch {
            items.push(`✓ ${pkg}: ❌ Not installed`);
        }
    });

    // Check config files
    const configs = [FILE_PATHS.ZSHRC, FILE_PATHS.STARSHIP_CONFIG];
    configs.forEach(config => {
        const exists = fs.existsSync(getHomeFilePath(config));
        items.push(`✓ ${config}: ${exists ? '✅ Configured' : '❌ Not configured'}`);
    });

    await vscode.window.showQuickPick(items, {
        title: 'Colorful Carbon Setup Status',
        canPickMany: true
    });
}

/**
 * Get zshrc configuration content with theme-aware git integration
 */
function getZshrcContent(): string {
    return `# Homebrew zsh plugins - tries multiple common locations
if [[ -f /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
    source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh
elif [[ -f /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
    source /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh
elif [[ -f /usr/share/zsh-autosuggestions/zsh-autosuggestions.zsh ]]; then
    source /usr/share/zsh-autosuggestions/zsh-autosuggestions.zsh
fi

# Configure syntax highlighting colors BEFORE loading the plugin
typeset -A ZSH_HIGHLIGHT_STYLES
ZSH_HIGHLIGHT_STYLES[command]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[function]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[alias]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[precommand]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[commandseparator]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[default]='fg=green'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=green'
ZSH_HIGHLIGHT_STYLES[arg0]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[reserved-word]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[suffix-alias]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[global-alias]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='fg=green'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='fg=green'

# zsh-syntax-highlighting (must be loaded last)
if [[ -f /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
    source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
elif [[ -f /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
    source /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
elif [[ -f /usr/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ]]; then
    source /usr/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
fi

# FZF
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# Git upstream tracking helper - checks once per terminal session
check_git_upstream() {
    # Only run if in a git repository
    if ! git rev-parse --git-dir &>/dev/null; then
        return
    fi

    # Get current branch
    local current_branch=$(git branch --show-current 2>/dev/null)
    if [[ -z "$current_branch" ]]; then
        return
    fi

    # Get upstream branch
    local upstream=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)

    # Check if remote branch exists
    local remote_branch="origin/$current_branch"
    git show-ref --verify --quiet "refs/remotes/$remote_branch" 2>/dev/null
    local remote_exists=$?

    # Case 1: No upstream set but remote exists
    if [[ -z "$upstream" && $remote_exists -eq 0 ]]; then
        echo ""
        echo "ℹ️  Remote branch '$remote_branch' exists but upstream not set"
        echo "💡 Run: git branch --set-upstream-to=$remote_branch"
        echo ""
    # Case 2: Upstream set but doesn't match current branch
    elif [[ -n "$upstream" && "$upstream" != "$remote_branch" && $remote_exists -eq 0 ]]; then
        echo ""
        echo "⚠️  Branch '$current_branch' is tracking '$upstream'"
        echo "💡 To track '$remote_branch' instead, run:"
        echo "    git branch --set-upstream-to=$remote_branch"
        echo ""
    fi
}

# Run check once per terminal (suppress if already checked)
if [[ -z "$CC_GIT_CHECK_DONE" ]]; then
    export CC_GIT_CHECK_DONE=1
    check_git_upstream
fi

# Colorful Carbon: Smart Git Auto-Fetch (opt-out: COLORFUL_CARBON_DISABLE_AUTOFETCH=1)
if [[ -z "$COLORFUL_CARBON_DISABLE_AUTOFETCH" ]]; then
  function __colorful_carbon_fetch() {
    # LAYER 1: Quick exit if not in git repo (~5ms)
    git rev-parse --git-dir >/dev/null 2>&1 || return

    # LAYER 2: Get repo root and hash (~10ms)
    local repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
    [[ -z "$repo_root" ]] && return

    local cache_dir="$HOME/.git-fetch-cache"
    local hash=$(echo -n "$repo_root" | shasum -a 256 2>/dev/null | cut -d' ' -f1)
    [[ -z "$hash" ]] && return

    local cache_file="$cache_dir/$hash"

    # LAYER 3: Quick cache age check (~5ms) - Exit early if fresh
    local last_fetch=0
    [[ -f "$cache_file" ]] && last_fetch=$(cat "$cache_file" 2>/dev/null || echo 0)
    local now=$(date +%s)
    local age=$((now - last_fetch))

    [[ $age -lt 900 ]] && return  # Cache fresh, exit early

    # LAYER 4: Only now do expensive operations
    local lock_file="$cache_file.lock"
    [[ -f "$lock_file" ]] && return  # Already fetching

    mkdir -p "$cache_dir" 2>/dev/null || return
    find "$cache_dir" -type f -not -name "*.lock" -mtime +30 -delete 2>/dev/null || true

    touch "$lock_file" 2>/dev/null || return
    (
      if git fetch --quiet --all --prune --tags 2>/dev/null; then
        echo $now > "$cache_file"
      fi
      rm -f "$lock_file"
    ) &!
  }

  if [[ ! " \${chpwd_functions[@]} " =~ " __colorful_carbon_fetch " ]]; then
    chpwd_functions+=(__colorful_carbon_fetch)
  fi
  if [[ ! " \${preexec_functions[@]} " =~ " __colorful_carbon_fetch " ]]; then
    preexec_functions+=(__colorful_carbon_fetch)
  fi
  __colorful_carbon_fetch
fi

# Initialize Starship prompt
eval "$(starship init zsh)"

# Reload starship helper function for theme changes
colorful_carbon_reload() {
    exec zsh
}

# Force color support for git
export TERM=xterm-256color

# Git color configuration
export GIT_PAGER='less -R'
export LESS='-R'

# Git wrapper to colorize branch names based on theme
git() {
    # Re-read theme file on EVERY execution for dynamic updates
    local CURRENT_CC_THEME="default"
    if [[ -f ~/.colorful-carbon-theme ]]; then
        CURRENT_CC_THEME=$(cat ~/.colorful-carbon-theme)
    fi

    # Call the real git command and capture output
    local output=$(command git "$@" 2>&1)
    local exit_code=$?

    # Update fetch cache on successful pull/fetch (for smart auto-fetch)
    if [[ $exit_code -eq 0 ]] && [[ -z "$COLORFUL_CARBON_DISABLE_AUTOFETCH" ]]; then
      case "$1" in
        pull|fetch)
          if git rev-parse --git-dir >/dev/null 2>&1; then
            local repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
            if [[ -n "$repo_root" ]]; then
              local cache_dir="$HOME/.git-fetch-cache"
              local hash
              if command -v shasum >/dev/null 2>&1; then
                hash=$(echo -n "$repo_root" | shasum -a 256 2>/dev/null | cut -d' ' -f1)
              elif command -v sha256sum >/dev/null 2>&1; then
                hash=$(echo -n "$repo_root" | sha256sum 2>/dev/null | cut -d' ' -f1)
              else
                hash=$(echo -n "$repo_root" | sed 's/\\//_/g')
              fi
              local cache_file="$cache_dir/$hash"
              mkdir -p "$cache_dir" 2>/dev/null && echo $(date +%s) > "$cache_file" 2>/dev/null
            fi
          fi
          ;;
      esac
    fi

    # Only colorize if it's a command that shows branches
    if [[ "$1" == "status" || "$1" == "st" || "$1" == "checkout" || "$1" == "branch" || "$1" == "log" || "$1" == "merge" || "$1" == "rebase" || "$1" == "cherry-pick" || "$1" == "switch" ]]; then
        # Apply theme-based coloring to branch names
        if [[ "$CURRENT_CC_THEME" == "dark-night" ]]; then
            # Yellow for dark-night theme
            echo "$output" | sed -E "s/(On branch |Switched to branch |Your branch is [^']*'|Merge branch '|Rebase branch ')([^'[:space:]]+)/\\1$(printf '\\033[33;1m')\\2$(printf '\\033[0m')/g"
        else
            # Magenta for default theme
            echo "$output" | sed -E "s/(On branch |Switched to branch |Your branch is [^']*'|Merge branch '|Rebase branch ')([^'[:space:]]+)/\\1$(printf '\\033[35;1m')\\2$(printf '\\033[0m')/g"
        fi
    else
        echo "$output"
    fi

    return $exit_code
}

# Simple git aliases (using the wrapper)
alias gst='git status'
alias glog='git log --oneline -10'
`;
}

/**
 * Update Starship configuration based on theme
 */
async function updateStarshipConfig(themeName: string): Promise<void> {
    const themeType = getThemeType(themeName);
    const starshipContent = themeType === 'dark-night' ? getDarkNightStarshipContent() : getStarshipContent();

    const starshipPath = getHomeFilePath(FILE_PATHS.STARSHIP_CONFIG);
    const markerPath = getHomeFilePath(FILE_PATHS.THEME_MARKER);

    // Write and sync starship config
    fs.writeFileSync(starshipPath, starshipContent);
    const starshipFd = fs.openSync(starshipPath, 'r');
    fs.fsyncSync(starshipFd);
    fs.closeSync(starshipFd);

    // Write and sync theme marker
    fs.writeFileSync(markerPath, themeType);
    const markerFd = fs.openSync(markerPath, 'r');
    fs.fsyncSync(markerFd);
    fs.closeSync(markerFd);

    // Update git command colors to match theme
    await setupGitColorsForTheme(themeType);
}

/**
 * Get default Starship theme configuration content
 */
function getStarshipContent(): string {
    return `# Custom Color-Coded Starship Theme

format = """
$username\\
$hostname\\
$directory\\
$git_branch\\
\${custom.git_upstream}\\
$git_status\\
$cmd_duration\\
$time\\
$line_break\\
$character"""

[username]
style_user = "bold cyan"
style_root = "bold red"
format = '[$user]($style)'
disabled = false
show_always = true

[hostname]
ssh_only = false
format = '[@](white)[$hostname](bold cyan) '
disabled = false

[directory]
style = "bold blue"  # Blue for project/directory name
format = "[$path]($style) "
truncation_length = 3
truncation_symbol = "…/"
home_symbol = "~"
read_only = " 🔒"
read_only_style = "bold red"

[git_branch]
symbol = "🎋 "
style = "bold fg:205"
format = 'on [$symbol$branch](bold fg:205) '

[git_status]
format = '([$all_status]($style)) '
conflicted = "[⚠️ conflicts](bold red) "
ahead = ""
behind = ""
diverged = ""
untracked = ""
stashed = ""
modified = ""
staged = ""
renamed = ""
deleted = ""
up_to_date = ""

# Custom module to show git upstream branch with mismatch detection
[custom.git_upstream]
command = '''
current=$(git branch --show-current 2>/dev/null)
upstream=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)

if [ -z "$upstream" ]; then
  exit 0
fi

# Calculate ahead/behind for tracked upstream
up_ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo 0)
up_behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo 0)

# Show upstream with its status
printf "%s" "-> $upstream "
if [ "$up_ahead" -gt 0 ] || [ "$up_behind" -gt 0 ]; then
  [ "$up_ahead" -gt 0 ] && printf "%s" "⬆ $up_ahead"
  [ "$up_behind" -gt 0 ] && printf "%s" "⬇ $up_behind"
  printf "%s" " "
else
  # Only claim "synced" if fetch cache is fresh (<5min)
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [ -n "$repo_root" ]; then
    hash=""
    if command -v shasum >/dev/null 2>&1; then
      hash=$(echo -n "$repo_root" | shasum -a 256 2>/dev/null | cut -d' ' -f1)
    elif command -v sha256sum >/dev/null 2>&1; then
      hash=$(echo -n "$repo_root" | sha256sum 2>/dev/null | cut -d' ' -f1)
    else
      hash=$(echo -n "$repo_root" | sed 's/\\//_/g')
    fi

    cache_file="$HOME/.git-fetch-cache/$hash"
    last_fetch=0
    [ -f "$cache_file" ] && last_fetch=$(cat "$cache_file" 2>/dev/null || echo 0)
    now=$(date +%s)
    age=$((now - last_fetch))

    if [ $age -lt 900 ]; then
      printf "%s" "(#synced) "
    fi
  fi
fi

# Check if origin/<current> exists and is different from upstream
if [ -n "$current" ]; then
  remote_branch="origin/$current"

  # Check if remote branch exists
  if git show-ref --verify --quiet "refs/remotes/$remote_branch" 2>/dev/null; then
    # If tracking different branch, show origin/<current> status
    if [ "$upstream" != "$remote_branch" ]; then
      # Calculate ahead/behind for origin/<current>
      ahead=$(git rev-list --count $remote_branch..HEAD 2>/dev/null || echo 0)
      behind=$(git rev-list --count HEAD..$remote_branch 2>/dev/null || echo 0)

      # Always show when there's a mismatch
      printf "%s" "| $remote_branch "
      if [ "$ahead" -gt 0 ] || [ "$behind" -gt 0 ]; then
        [ "$ahead" -gt 0 ] && printf "%s" "⬆ $ahead"
        [ "$behind" -gt 0 ] && printf "%s" "⬇ $behind"
      else
        printf "%s" "(#synced)"
      fi
      printf "%s" " "
    fi
  fi
fi
'''
when = "git rev-parse --git-dir 2>/dev/null"
shell = ["sh"]
style = "bold fg:150"
format = "[$output]($style)"

[nodejs]
symbol = " "
style = "bold green"
format = 'via [$symbol($version)]($style) '

[python]
symbol = "🐍 "
style = "bold yellow"
format = 'via [$symbol($version)(\\($virtualenv\\))]($style) '

[character]
success_symbol = '[❯](bold green)'  # Green for successful command
error_symbol = '[✖](bold red)'  # Red for failed command
vimcmd_symbol = '[❮](bold green)'

[line_break]
disabled = false

[time]
disabled = false
format = ' [$time](bold fg:241)'  # Gray color for time at the end
time_format = '%d %b %Y %H:%M'  # Format: 8 Nov 2024 22:45
utc_time_offset = 'local'
`;
}

/**
 * Get Dark Night Starship theme configuration content
 */
function getDarkNightStarshipContent(): string {
    return `# Custom Color-Coded Starship Theme - Dark Night

format = """
$username\\
$hostname\\
$directory\\
$git_branch\\
\${custom.git_upstream}\\
$git_status\\
$cmd_duration\\
$time\\
$line_break\\
$character"""

[username]
style_user = "bold fg:#6BCB77"  # Fresh Green
style_root = "bold red"
format = '[$user]($style)'
disabled = false
show_always = true

[hostname]
ssh_only = false
format = '[@](white)[$hostname](bold fg:#6BCB77) '
disabled = false

[directory]
style = "bold fg:#4ECDC4"  # Turquoise for project/directory name
format = "[$path]($style) "
truncation_length = 3
truncation_symbol = "…/"
home_symbol = "~"
read_only = " 🔒"
read_only_style = "bold red"

[git_branch]
symbol = "🎋 "
style = "bold fg:#FFD93D"
format = 'on [$symbol$branch](bold fg:#FFD93D) '

[git_status]
format = '([$all_status]($style)) '
conflicted = "[⚠️ conflicts](bold fg:#FF6B6B) "
ahead = ""
behind = ""
diverged = ""
untracked = ""
stashed = ""
modified = ""
staged = ""
renamed = ""
deleted = ""
up_to_date = ""

# Custom module to show git upstream branch with mismatch detection
[custom.git_upstream]
command = '''
current=$(git branch --show-current 2>/dev/null)
upstream=$(git rev-parse --abbrev-ref @{upstream} 2>/dev/null)

if [ -z "$upstream" ]; then
  exit 0
fi

# Calculate ahead/behind for tracked upstream
up_ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo 0)
up_behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo 0)

# Show upstream with its status
printf "%s" "-> $upstream "
if [ "$up_ahead" -gt 0 ] || [ "$up_behind" -gt 0 ]; then
  [ "$up_ahead" -gt 0 ] && printf "%s" "⬆ $up_ahead"
  [ "$up_behind" -gt 0 ] && printf "%s" "⬇ $up_behind"
  printf "%s" " "
else
  # Only claim "synced" if fetch cache is fresh (<5min)
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [ -n "$repo_root" ]; then
    hash=""
    if command -v shasum >/dev/null 2>&1; then
      hash=$(echo -n "$repo_root" | shasum -a 256 2>/dev/null | cut -d' ' -f1)
    elif command -v sha256sum >/dev/null 2>&1; then
      hash=$(echo -n "$repo_root" | sha256sum 2>/dev/null | cut -d' ' -f1)
    else
      hash=$(echo -n "$repo_root" | sed 's/\\//_/g')
    fi

    cache_file="$HOME/.git-fetch-cache/$hash"
    last_fetch=0
    [ -f "$cache_file" ] && last_fetch=$(cat "$cache_file" 2>/dev/null || echo 0)
    now=$(date +%s)
    age=$((now - last_fetch))

    if [ $age -lt 900 ]; then
      printf "%s" "(#synced) "
    fi
  fi
fi

# Check if origin/<current> exists and is different from upstream
if [ -n "$current" ]; then
  remote_branch="origin/$current"

  # Check if remote branch exists
  if git show-ref --verify --quiet "refs/remotes/$remote_branch" 2>/dev/null; then
    # If tracking different branch, show origin/<current> status
    if [ "$upstream" != "$remote_branch" ]; then
      # Calculate ahead/behind for origin/<current>
      ahead=$(git rev-list --count $remote_branch..HEAD 2>/dev/null || echo 0)
      behind=$(git rev-list --count HEAD..$remote_branch 2>/dev/null || echo 0)

      # Always show when there's a mismatch
      printf "%s" "| $remote_branch "
      if [ "$ahead" -gt 0 ] || [ "$behind" -gt 0 ]; then
        [ "$ahead" -gt 0 ] && printf "%s" "⬆ $ahead"
        [ "$behind" -gt 0 ] && printf "%s" "⬇ $behind"
      else
        printf "%s" "(#synced)"
      fi
      printf "%s" " "
    fi
  fi
fi
'''
when = "git rev-parse --git-dir 2>/dev/null"
shell = ["sh"]
style = "bold fg:#C792EA"
format = "[$output]($style)"

[nodejs]
symbol = " "
style = "bold fg:#6BCB77"
format = 'via [$symbol($version)]($style) '

[python]
symbol = "🐍 "
style = "bold fg:#FFD93D"
format = 'via [$symbol($version)(\\($virtualenv\\))]($style) '

[character]
success_symbol = '[❯](bold fg:#4D96FF)'  # Bright Blue for successful command
error_symbol = '[✖](bold fg:#FF6B6B)'  # Coral Red for failed command
vimcmd_symbol = '[❮](bold fg:#4D96FF)'

[line_break]
disabled = false

[time]
disabled = false
format = ' [$time](bold fg:#9CA3AF)'  # Soft Gray color for time at the end
time_format = '%d %b %Y %H:%M'  # Format: 8 Nov 2024 22:45
utc_time_offset = 'local'
`;
}

/**
 * Remove Colorful Carbon terminal configurations
 */
async function removeTerminalConfiguration(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'This will remove Colorful Carbon terminal configurations. Your original settings will be preserved. Continue?',
        'Yes, Remove',
        'Cancel'
    );

    if (confirm !== 'Yes, Remove') {
        return;
    }

    // Remove our section from .zshrc
    const zshrcPath = getHomeFilePath(FILE_PATHS.ZSHRC);
    if (fs.existsSync(zshrcPath)) {
        const content = fs.readFileSync(zshrcPath, 'utf8');
        // Remove our configuration block
        const updatedContent = content.replace(
            /\n*# Colorful Carbon Configuration - START[\s\S]*?# Colorful Carbon Configuration - END\n*/g,
            ''
        );
        fs.writeFileSync(zshrcPath, updatedContent);
    }

    // Remove starship.toml (only if it's ours)
    const starshipPath = getHomeFilePath(FILE_PATHS.STARSHIP_CONFIG);
    if (fs.existsSync(starshipPath)) {
        const content = fs.readFileSync(starshipPath, 'utf8');
        if (content.includes('Custom Color-Coded Starship Theme')) {
            fs.unlinkSync(starshipPath);
        }
    }

    vscode.window.showInformationMessage(
        'Terminal configurations removed. Restart your terminal to see changes.'
    );
}

export function deactivate() {}