// Allows opening side panel on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// Optional: Keyboard shortcut listener could be implemented here using chrome.commands
chrome.commands.onCommand.addListener((command) => {
    if (command === "_execute_action") {
        // Triggering side panel opening via command is native if openPanelOnActionClick is set
    }
});
