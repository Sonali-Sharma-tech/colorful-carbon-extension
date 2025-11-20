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
                console.log('[Theme Listener] Skipping - manual switch in progress');
                return;
            }

            // Small delay to ensure config is fully written
            await new Promise(resolve => setTimeout(resolve, DELAYS.THEME_CONFIG_WRITE));

            const themeName = getCurrentThemeName();

            if (isColorfulCarbonTheme(themeName)) {
                // Only update if theme actually changed
                if (lastAppliedTheme !== themeName) {
                    const themeType = themeName === THEME_NAMES.DARK_NIGHT ? 'Dark Night' : 'Default';
                    lastAppliedTheme = themeName;

                    // Update starship config based on theme
                    await updateStarshipConfig(themeName!);

                    // Small delay to ensure file system flush completes
                    await new Promise(resolve => setTimeout(resolve, 200));

                    // Automatically reload all existing terminals
                    reloadAllTerminals();

                    // Show success message
                    vscode.window.showInformationMessage(
                        `🎨 Switched to ${themeType} theme! All terminals reloaded.`
                    );
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
 * Extension activation - initializes theme, git tracking, and UI components
 */
export async function activate(context: vscode.ExtensionContext) {
    const config = getColorfulCarbonConfig();

    // Initialize terminal theme
    await initializeTheme(config);

    // Show welcome message if needed
    await handleWelcomeMessage(context, config);

    // Register all commands
    registerCommands(context);

    // Setup status bar
    setupStatusBar(context);

    // Setup theme change listener
    setupThemeChangeListener(context);
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
 * Setup Git color configuration for better terminal output
 */
async function setupGitColors(): Promise<void> {
    const gitCommands = [
        ['color.ui', 'auto'],
        ['color.status', 'always'],
        ['color.status.branch', 'yellow bold'],
        ['color.status.localBranch', 'yellow bold'],
        ['color.status.remoteBranch', 'yellow bold'],
        ['color.status.header', 'magenta'],
        ['color.status.added', 'green'],
        ['color.status.changed', 'yellow'],
        ['color.status.untracked', 'yellow'],
        ['color.status.deleted', 'red'],
        ['color.diff.meta', 'bold yellow'],
        ['color.diff.frag', 'magenta bold'],
        ['color.diff.old', 'red'],
        ['color.diff.new', 'green']
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
  [ "$up_ahead" -gt 0 ] && printf "%s" "⬆$up_ahead"
  [ "$up_behind" -gt 0 ] && printf "%s" "⬇$up_behind"
  printf "%s" " "
else
  printf "%s" "(#synced) "
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
        [ "$ahead" -gt 0 ] && printf "%s" "⬆$ahead"
        [ "$behind" -gt 0 ] && printf "%s" "⬇$behind"
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
format = '([$all_status$ahead_behind]($style)) '
conflicted = "[⚠️ conflicts](bold fg:#FF6B6B) "
ahead = "[⬆\${count}](bold fg:#6BCB77) "
behind = "[⬇\${count}](bold fg:#FF8B13) "
diverged = "[⇅ ⬆\${ahead_count}⬇\${behind_count}](bold fg:#FF8B13) "
untracked = ""
stashed = ""
modified = ""
staged = ""
renamed = ""
deleted = ""
up_to_date = "[(#synced)](bold fg:#6BCB77) "

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
  [ "$up_ahead" -gt 0 ] && printf "%s" "⬆$up_ahead"
  [ "$up_behind" -gt 0 ] && printf "%s" "⬇$up_behind"
  printf "%s" " "
else
  printf "%s" "(#synced) "
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
        [ "$ahead" -gt 0 ] && printf "%s" "⬆$ahead"
        [ "$behind" -gt 0 ] && printf "%s" "⬇$behind"
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