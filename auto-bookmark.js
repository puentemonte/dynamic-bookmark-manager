function calculateNextValue(currentValue, operation) {
    return operation === '+' ? currentValue + 1 : currentValue - 1;
}

function getNextMonthValue(currentValue, operation) {
    // For monthly increments, we need to handle the actual calendar months
    const date = new Date();
    date.setMonth(date.getMonth() + (operation === '+' ? 1 : -1));
    return currentValue + (operation === '+' ? 1 : -1);
}

async function createOrUpdateBookmark() {
    const settings = await browser.storage.local.get([
        'urlPattern',
        'operation',
        'periodicity',
        'timeUnit',
        'bookmarkName',
        'lastValue',
        'bookmarkId',
        'lastUpdateTime'
    ]);

    let currentValue = settings.lastValue || settings.periodicity;
    const now = Date.now();
    
    // Generate the current URL
    const currentUrl = settings.urlPattern.replace('{variable}', currentValue);

    try {
        if (settings.bookmarkId) {
            // Update existing bookmark
            await browser.bookmarks.update(settings.bookmarkId, {
                url: currentUrl
            });
        } else {
            // Create new bookmark in the toolbar
            const bookmark = await browser.bookmarks.create({
                title: settings.bookmarkName,
                url: currentUrl,
                type: 'bookmark',
                parentId: 'toolbar_____'  // Firefox's bookmark toolbar folder
            });
            
            // Save the bookmark ID
            await browser.storage.local.set({ bookmarkId: bookmark.id });
        }

        // Calculate next value based on time unit
        let nextValue;
        if (settings.timeUnit === 'months') {
            nextValue = getNextMonthValue(currentValue, settings.operation);
        } else {
            nextValue = calculateNextValue(currentValue, settings.operation);
        }

        // Save the next value and update time
        await browser.storage.local.set({ 
            lastValue: nextValue,
            lastUpdateTime: now
        });
    } catch (error) {
        console.error('Error managing bookmark:', error);
        throw error;
    }
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'createOrUpdateBookmark') {
        return createOrUpdateBookmark();  // Return promise for async operation
    }
});

// Set up different update intervals based on time unit
browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'updateBookmark') {
        const settings = await browser.storage.local.get(['timeUnit']);
        await createOrUpdateBookmark();

        // Adjust the next alarm interval based on time unit
        let nextInterval;
        switch (settings.timeUnit) {
            case 'days':
                nextInterval = 24 * 60; // 24 hours in minutes
                break;
            case 'weeks':
                nextInterval = 7 * 24 * 60; // 7 days in minutes
                break;
            case 'months':
                nextInterval = 30 * 24 * 60; // Approximately 30 days in minutes
                break;
            default:
                nextInterval = 24 * 60;
        }
        
        browser.alarms.create('updateBookmark', { periodInMinutes: nextInterval });
    }
});

// Initial alarm setup
browser.alarms.create('updateBookmark', { periodInMinutes: 24 * 60 });