document.addEventListener('DOMContentLoaded', function() {
    const urlPatternInput = document.getElementById('urlPattern');
    const operationSelect = document.getElementById('operation');
    const periodicityInput = document.getElementById('periodicity');
    const timeUnitSelect = document.getElementById('timeUnit');
    const bookmarkNameInput = document.getElementById('bookmarkName');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    const previewDiv = document.getElementById('preview');
    const previewValuesSpan = document.getElementById('previewValues');

    // Load saved settings
    browser.storage.local.get(['urlPattern', 'operation', 'periodicity', 'timeUnit', 'bookmarkName'])
        .then((result) => {
            if (result.urlPattern) urlPatternInput.value = result.urlPattern;
            if (result.operation) operationSelect.value = result.operation;
            if (result.periodicity) periodicityInput.value = result.periodicity;
            if (result.timeUnit) timeUnitSelect.value = result.timeUnit;
            if (result.bookmarkName) bookmarkNameInput.value = result.bookmarkName;
            updatePreview();
        });

    // Add input event listeners for live preview
    [urlPatternInput, operationSelect, periodicityInput, timeUnitSelect].forEach(element => {
        element.addEventListener('input', updatePreview);
    });

    function updatePreview() {
        const urlPattern = urlPatternInput.value;
        const operation = operationSelect.value;
        const periodicity = parseInt(periodicityInput.value) || 0;
        const timeUnit = timeUnitSelect.value;

        if (urlPattern && urlPattern.includes('{variable}') && periodicity > 0) {
            let currentValue = 1;
            let previewValues = [];

            for (let i = 0; i < 3; i++) {
                previewValues.push(urlPattern.replace('{variable}', currentValue));
                currentValue = calculateNextValue(currentValue, operation);
            }

            previewValuesSpan.textContent = previewValues.join(' → ');
            previewDiv.style.display = 'block';
        } else {
            previewDiv.style.display = 'none';
        }
    }

    saveButton.addEventListener('click', async function() {
        const urlPattern = urlPatternInput.value;
        const operation = operationSelect.value;
        const periodicity = parseInt(periodicityInput.value);
        const timeUnit = timeUnitSelect.value;
        const bookmarkName = bookmarkNameInput.value;

        if (!urlPattern || !periodicity || !bookmarkName) {
            showStatus('Please fill in all fields', 'error');
            return;
        }

        if (!urlPattern.includes('{variable}')) {
            showStatus('URL pattern must include {variable}', 'error');
            return;
        }

        try {
            // Save the settings
            await browser.storage.local.set({
                urlPattern,
                operation,
                periodicity,
                timeUnit,
                bookmarkName,
                lastValue: periodicity,
                lastUpdateTime: Date.now()  // Store last update time
            });

            // Create or update the bookmark
            await browser.runtime.sendMessage({
                action: 'createOrUpdateBookmark'
            });
            
            showStatus('Dynamic bookmark saved successfully!', 'success');
        } catch (error) {
            showStatus('Error: ' + error.message, 'error');
        }
    });

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        statusDiv.style.backgroundColor = type === 'error' ? '#ffd6d6' : '#d6ffd6';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
});