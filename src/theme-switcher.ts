import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Flag to prevent double execution when using theme switch commands
let isManualThemeSwitch = false;

export function isManualSwitch(): boolean {
    return isManualThemeSwitch;
}

export function switchToTheme(themeName: 'default' | 'dark-night') {
    const homeDir = os.homedir();

    console.log(`Switching to ${themeName} theme...`);

    // Set flag BEFORE any operations to prevent listener from firing
    isManualThemeSwitch = true;

    // 1. Update theme marker file
    const themeMarkerPath = path.join(homeDir, '.colorful-carbon-theme');
    fs.writeFileSync(themeMarkerPath, themeName);
    // Force file system sync to ensure file is written before terminal reload
    const markerFd = fs.openSync(themeMarkerPath, 'r');
    fs.fsyncSync(markerFd);
    fs.closeSync(markerFd);
    console.log(`✓ Updated theme marker: ${themeName}`);

    // 2. Update starship.toml
    const starshipPath = path.join(homeDir, '.config', 'starship.toml');
    const starshipContent = themeName === 'dark-night' ? getDarkNightStarshipContent() : getDefaultStarshipContent();
    fs.writeFileSync(starshipPath, starshipContent);
    // Force file system sync to ensure file is written before terminal reload
    const starshipFd = fs.openSync(starshipPath, 'r');
    fs.fsyncSync(starshipFd);
    fs.closeSync(starshipFd);
    console.log(`✓ Updated starship.toml for ${themeName} theme`);

    // 3. Update VS Code theme
    const vsCodeTheme = themeName === 'dark-night' ? 'Colorful Carbon Dark Night' : 'Colorful Carbon';
    vscode.workspace.getConfiguration().update('workbench.colorTheme', vsCodeTheme, vscode.ConfigurationTarget.Global);
    console.log(`✓ Updated VS Code theme to: ${vsCodeTheme}`);

    // 4. Apply VS Code terminal settings
    applyTerminalSettings();
    console.log(`✓ Applied terminal color settings`);

    // 5. Reload all terminals
    reloadAllTerminals();

    // 6. Show success message
    vscode.window.showInformationMessage(
        `🎨 Switched to ${themeName === 'dark-night' ? 'Dark Night' : 'Default'} theme! Reload shells to see prompt changes.`,
        'Reload All Shells',
        'Open New Terminal'
    ).then(selection => {
        if (selection === 'Reload All Shells') {
            reloadAllTerminals();
            vscode.window.showInformationMessage('✓ All terminal shells reloaded!');
        } else if (selection === 'Open New Terminal') {
            const terminal = vscode.window.createTerminal(`Colorful Carbon ${themeName === 'dark-night' ? 'Dark Night' : 'Default'}`);
            terminal.show();
            // Give terminal time to initialize, then reload to pick up new starship config
            setTimeout(() => {
                terminal.sendText('exec zsh', true);
            }, 1000);
        }
    });

    // Reset flag after theme switch completes (500ms should be enough)
    setTimeout(() => {
        isManualThemeSwitch = false;
        console.log('✓ Manual theme switch flag reset');
    }, 500);
}

function applyTerminalSettings() {
    const config = vscode.workspace.getConfiguration();

    // Apply terminal settings (colors are controlled by the theme itself)
    config.update('terminal.integrated.fontFamily', "'MesloLGM Nerd Font', 'MesloLGS NF', 'SF Mono', Monaco, 'Courier New', monospace", vscode.ConfigurationTarget.Global);
    config.update('terminal.integrated.cursorStyle', 'block', vscode.ConfigurationTarget.Global);
    config.update('terminal.integrated.fontWeight', 'normal', vscode.ConfigurationTarget.Global);
    config.update('terminal.integrated.lineHeight', 1.2, vscode.ConfigurationTarget.Global);
}

function reloadAllTerminals() {
    // Send reload command to all open terminals
    vscode.window.terminals.forEach(terminal => {
        terminal.sendText('exec zsh');
    });
}

function getDefaultStarshipContent(): string {
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
symbol = "🎋 "
style = "bold fg:205"
format = 'on [$symbol$branch](bold fg:205)[(->$remote_branch)](bold fg:150) '

[git_status]
format = '([$all_status$ahead_behind]($style))'
conflicted = "[#conflicts](bold red) "
ahead = "[\u2191\${count}](bold green) "
behind = "[\u2193\${count}](bold yellow) "
diverged = "[\u2191\${ahead_count}](bold green)[\u2193\${behind_count}](bold yellow) "
untracked = ""
stashed = ""
modified = ""
staged = ""
renamed = ""
deleted = ""
up_to_date = "[#synced](bold fg:172) "

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

function getDarkNightStarshipContent(): string {
    return `# Custom Color-Coded Starship Theme - Dark Night

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
format = 'on [$symbol$branch](bold fg:#FFD93D)[(->$remote_branch)](bold fg:#C792EA) '

[git_status]
format = '([$all_status$ahead_behind]($style))'
conflicted = "[#conflicts](bold fg:#FF6B6B) "
ahead = "[\u2191\${count}](bold fg:#6BCB77) "
behind = "[\u2193\${count}](bold fg:#FF8B13) "
diverged = "[\u2191\${ahead_count}](bold fg:#6BCB77)[\u2193\${behind_count}](bold fg:#FF8B13) "
untracked = ""
stashed = ""
modified = ""
staged = ""
renamed = ""
deleted = ""
up_to_date = "[#synced](bold fg:172) "

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