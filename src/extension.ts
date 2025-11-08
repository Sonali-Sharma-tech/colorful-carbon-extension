import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export async function activate(context: vscode.ExtensionContext) {
    // Auto-apply terminal theme on activation
    const config = vscode.workspace.getConfiguration('colorfulCarbon');
    if (config.get('autoApplyTerminalTheme')) {
        applyTerminalSettings();
    }

    // Check if this is first activation
    const isFirstActivation = context.globalState.get('colorfulCarbon.firstActivation', true);
    const setupDismissed = context.globalState.get('colorfulCarbon.setupDismissed', false);

    if (isFirstActivation) {
        // Mark as not first activation anymore
        context.globalState.update('colorfulCarbon.firstActivation', false);

        // Show smart welcome message
        if (config.get('showWelcomeMessage')) {
            // Delay slightly to ensure theme is applied first
            setTimeout(() => showWelcomeMessage(context), 1000);
        }
    } else if (!setupDismissed) {
        // Check if there are still missing dependencies
        const missingDeps = await checkMissingDependencies();

        if (missingDeps.length > 0 && config.get('showWelcomeMessage')) {
            // Show a subtle reminder
            setTimeout(() => showWelcomeMessage(context), 2000);
        }
    }

    // Register commands
    const applyCompleteSetup = vscode.commands.registerCommand('colorful-carbon.applyCompleteSetup', async () => {
        await runCompleteSetup();
    });

    const installDependencies = vscode.commands.registerCommand('colorful-carbon.installTerminalDependencies', async () => {
        await installTerminalDependencies();
    });

    const applyTerminalConfig = vscode.commands.registerCommand('colorful-carbon.applyTerminalConfig', async () => {
        await applyTerminalConfiguration();
    });

    const showStatus = vscode.commands.registerCommand('colorful-carbon.showSetupStatus', async () => {
        await showSetupStatus();
    });

    const removeConfig = vscode.commands.registerCommand('colorful-carbon.removeTerminalConfig', async () => {
        await removeTerminalConfiguration();
    });

    context.subscriptions.push(applyCompleteSetup, installDependencies, applyTerminalConfig, showStatus, removeConfig);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    updateStatusBar(statusBarItem);
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Update status bar periodically
    const interval = setInterval(() => updateStatusBar(statusBarItem), 30000); // Every 30 seconds
    context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

async function updateStatusBar(statusBarItem: vscode.StatusBarItem) {
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

function applyTerminalSettings() {
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

async function showWelcomeMessage(context: vscode.ExtensionContext) {
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

async function runCompleteSetup() {
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

async function applyTerminalConfiguration(): Promise<void> {
    const homeDir = os.homedir();

    // Backup existing configs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configs = ['.zshrc', '.config/starship.toml'];

    configs.forEach(config => {
        const configPath = path.join(homeDir, config);
        if (fs.existsSync(configPath)) {
            const backupPath = `${configPath}.backup-${timestamp}`;
            fs.copyFileSync(configPath, backupPath);
        }
    });

    // Create .config directory if it doesn't exist
    const configDir = path.join(homeDir, '.config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    // Handle .zshrc safely - append our config instead of overwriting
    const zshrcPath = path.join(homeDir, '.zshrc');
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

    // Write starship.toml - this one is safe to overwrite as it's specific to our tool
    const starshipContent = getStarshipContent();
    fs.writeFileSync(path.join(homeDir, '.config', 'starship.toml'), starshipContent);
}

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

async function finalizeSetup(): Promise<void> {
    // Apply VS Code settings
    applyTerminalSettings();

    // Create a setup completion marker
    const homeDir = os.homedir();
    const markerPath = path.join(homeDir, '.config', '.colorful-carbon-installed');
    fs.writeFileSync(markerPath, new Date().toISOString());
}

async function showSetupStatus(): Promise<void> {
    const items: string[] = [];

    // Check theme
    const currentTheme = vscode.workspace.getConfiguration().get('workbench.colorTheme');
    items.push(`✓ Theme: ${currentTheme === 'Colorful Carbon' ? '✅ Applied' : '❌ Not applied'}`);

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
    const homeDir = os.homedir();
    const configs = ['.zshrc', '.config/starship.toml'];
    configs.forEach(config => {
        const exists = fs.existsSync(path.join(homeDir, config));
        items.push(`✓ ${config}: ${exists ? '✅ Configured' : '❌ Not configured'}`);
    });

    await vscode.window.showQuickPick(items, {
        title: 'Colorful Carbon Setup Status',
        canPickMany: true
    });
}

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

# Initialize Starship prompt
eval "$(starship init zsh)"

# Force color support for git
export TERM=xterm-256color

# Git color configuration
export GIT_PAGER='less -R'
export LESS='-R'

# Custom git wrapper to colorize specific lines
git() {
    if [[ "$1" == "status" ]]; then
        command git status "$@" | sed -E \\
            -e "s/'origin\\/([^']+)'/$(printf '\\033[1;33m')'origin\\/\\1'$(printf '\\033[0m')/g" \\
            -e "s/no changes added to commit.*/$(printf '\\033[35m')&$(printf '\\033[0m')/" \\
            -e "s/nothing to commit.*/$(printf '\\033[35m')&$(printf '\\033[0m')/"
    else
        command git "$@"
    fi
}
`;
}

function getStarshipContent(): string {
    return `# Custom Color-Coded Starship Theme

format = """
$username\\
$hostname\\
$directory\\
$git_branch\\
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
symbol = " "
style = "bold fg:205"  # Pink for branch name
format = 'on [$symbol$branch](bold fg:205) '

[git_status]
format = '([$all_status$ahead_behind]($style))'
conflicted = "[#conflicts](bold red) "
ahead = "[↑\${count}](bold green) "
behind = "[↓\${count}](bold yellow) "
diverged = "[↑\${ahead_count}](bold green)[↓\${behind_count}](bold yellow) "
untracked = ""
stashed = ""
modified = ""
staged = ""
renamed = ""
deleted = ""
up_to_date = "[#synced](bold green) "

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

async function removeTerminalConfiguration(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
        'This will remove Colorful Carbon terminal configurations. Your original settings will be preserved. Continue?',
        'Yes, Remove',
        'Cancel'
    );

    if (confirm !== 'Yes, Remove') {
        return;
    }

    const homeDir = os.homedir();

    // Remove our section from .zshrc
    const zshrcPath = path.join(homeDir, '.zshrc');
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
    const starshipPath = path.join(homeDir, '.config', 'starship.toml');
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