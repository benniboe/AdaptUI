// AdaptUI Popup

console.log('Popup: Script starting...');

// Wait for DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Popup: DOM loaded');
    
    const statsContainer = document.getElementById('statsContainer');
    const totalClicksDiv = document.getElementById('totalClicks');
    const resetBtn = document.getElementById('resetBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    // Verify elements exist
    if (!statsContainer) {
        console.error('Popup: statsContainer not found!');
        return;
    }
    
    console.log('Popup: All elements found, proceeding...');
    
    // =========================
    // Show statistics
    // =========================
    
function displayStats() {
    console.log('Popup: Loading stats...');
    
    statsContainer.innerHTML = `
        <div class="no-data">
            <div class="no-data-icon">⏳</div>
            <p>Loading data...</p>
        </div>
    `;
    
    chrome.storage.local.get(null, function(allData) {
        console.log('Popup: All data:', allData);
        
        if (chrome.runtime.lastError) {
            console.error('Popup: Error:', chrome.runtime.lastError);
            return;
        }
        
        // Find all adaptui_ keys (one per site)
        const siteKeys = Object.keys(allData).filter(key => key.startsWith('adaptui_'));
        
        if (siteKeys.length === 0) {
            statsContainer.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">📭</div>
                    <p>No data yet.<br>Visit websites to track navigation!</p>
                </div>
            `;
            totalClicksDiv.textContent = '';
            return;
        }
        
        let html = '';
        let totalClicks = 0;
        
        // Show stats for each site
        siteKeys.forEach(key => {
            const domain = key.replace('adaptui_', '');
            const siteData = allData[key];
            const clicks = siteData.menuClicks || {};
            
            const siteTotal = Object.values(clicks).reduce((sum, count) => sum + count, 0);
            totalClicks += siteTotal;
            
            html += `<div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">`;
            html += `<strong style="color: #667eea;">🌐 ${domain}</strong> (${siteTotal} clicks)<br>`;
            
            const sorted = Object.entries(clicks).sort((a, b) => b[1] - a[1]).slice(0, 3);
            sorted.forEach(([page, count], i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
                html += `<div style="font-size: 0.9em; padding: 4px 0;">${medal} ${page}: ${count}</div>`;
            });
            
            html += `</div>`;
        });
        
        totalClicksDiv.textContent = `Total Clicks: ${totalClicks} across ${siteKeys.length} site(s)`;
        statsContainer.innerHTML = html;
    });
}
    
    // =========================
// DISPLAY TIME PATTERNS
// =========================

function displayTimePatterns() {
    const container = document.getElementById('timePatternsContainer');
    
    chrome.storage.local.get(['timePatterns'], function(result) {
        const patterns = result.timePatterns || {};
        
        // Check if we have any time data
        const hasData = Object.keys(patterns).some(timeSlot => 
            Object.keys(patterns[timeSlot] || {}).length > 0
        );
        
        if (!hasData) {
            container.innerHTML = '<div class="no-data"><p>Learning your time-based habits...</p></div>';
            return;
        }
        
        let html = '';
        
        // Show patterns for each time slot
        const timeSlots = ['morning', 'afternoon', 'evening', 'night'];
        const emojis = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙' };
        
        timeSlots.forEach(slot => {
            const slotData = patterns[slot] || {};
            
            if (Object.keys(slotData).length === 0) return;
            
            // Find most visited page in this slot
            let topPage = null;
            let maxClicks = 0;
            
            for (let page in slotData) {
                if (slotData[page] > maxClicks) {
                    maxClicks = slotData[page];
                    topPage = page;
                }
            }
            
            if (topPage) {
                html += `
                    <div class="stat-item" style="background: linear-gradient(to right, #fff8e1, #fff);">
                        <span class="page-name">${emojis[slot]} ${slot}: <strong>${topPage}</strong></span>
                        <span class="click-count">${maxClicks} clicks</span>
                    </div>
                `;
            }
        });
        
        container.innerHTML = html || '<div class="no-data"><p>Building patterns...</p></div>';
    });
}

// =========================
// DISPLAY ML STATISTICS
// =========================

function displayMLStats() {
    const container = document.getElementById('mlStatsContainer');
    
    chrome.storage.local.get(['clickSequence'], function(result) {
        const sequence = result.clickSequence || [];
        
        if (sequence.length < 15) {
            container.innerHTML = `
                <div class="no-data">
                    <p>📊 Collecting data: ${sequence.length}/15 clicks</p>
                    <p style="font-size: 0.85em; color: #7f8c8d;">Need ${15 - sequence.length} more clicks to train AI</p>
                </div>
            `;
            return;
        }
        
        // Analyze prediction accuracy (simplified)
        let html = `
            <div class="stat-item" style="background: linear-gradient(to right, #e8f5e9, #fff);">
                <span class="page-name">🤖 Neural Network Status</span>
                <span class="click-count" style="background: #27ae60;">ACTIVE</span>
            </div>
            <div class="stat-item">
                <span class="page-name">Training Data</span>
                <span class="click-count">${sequence.length} sequences</span>
            </div>
        `;
        
        // Show most common transitions
        const transitions = {};

        for (let i = 0; i < sequence.length - 1; i++) {
            const from = sequence[i].to;
            const to = sequence[i + 1].to;
            const key = `${from} → ${to}`;
            transitions[key] = (transitions[key] || 0) + 1;
        }

        const sortedTransitions = Object.entries(transitions).sort((a, b) => b[1] - a[1]);

        if (sortedTransitions.length > 0) {
            html += `<div class="stat-item"><span class="page-name">Top transitions</span></div>`;
            sortedTransitions.slice(0, 5).forEach(([key, count]) => {
                html += `
                    <div class="stat-item">
                        <span class="page-name">${key}</span>
                        <span class="click-count">${count}</span>
                    </div>
                `;
            });
        }

        container.innerHTML = html;

    });
}

// Display stats
    console.log('Popup: Calling displayStats()...');
    displayStats();
    displayTimePatterns();
    displayMLStats();  
    
    // =========================
    // Reset Button
    // =========================
    
    resetBtn.addEventListener('click', function() {
        console.log('Popup: Reset clicked');
        
        if (!confirm('⚠️ Delete all tracking data?\n\nThis cannot be undone.')) {
            console.log('Popup: Reset cancelled');
            return;
        }
        
        console.log('Popup: Reset confirmed, clearing storage...');
        
        chrome.storage.local.clear(function() {
            if (chrome.runtime.lastError) {
                console.error('Popup: Clear error:', chrome.runtime.lastError);
                alert('❌ Error: ' + chrome.runtime.lastError.message);
                return;
            }
            
            console.log('Popup: Storage cleared successfully');
            
            statsContainer.innerHTML = `
                <div class="no-data">
                    <div class="no-data-icon">✅</div>
                    <p>Data reset!<br>Reload pages to see changes.</p>
                </div>
            `;
            totalClicksDiv.textContent = '';
            
            alert('✅ Data reset!\n\nReload your website to see the original menu.');
        });
    });
    
    // =========================
    // Export Button
    // =========================
    
    exportBtn.addEventListener('click', function() {
        console.log('Popup: Export clicked');
        
        chrome.storage.local.get(null, function(allData) {
            console.log('Popup: Exporting data:', allData);
            
            if (chrome.runtime.lastError) {
                console.error('Popup: Export error:', chrome.runtime.lastError);
                alert('❌ Error: ' + chrome.runtime.lastError.message);
                return;
            }
            
            if (!allData.menuClicks || Object.keys(allData.menuClicks).length === 0) {
                alert('⚠️ No data to export.\n\nClick some menu items first!');
                return;
            }
            
            // Create export object
            const exportData = {
                exportDate: new Date().toISOString(),
                extensionVersion: '1.0.0',
                data: allData
            };
            
            // Convert to JSON
            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            const filename = `adapt-ui-${timestamp}.json`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('Popup: Export complete:', filename);
            alert(`✅ Exported:\n${filename}`);
        });
    });
    
    console.log('Popup: All handlers attached');
});

console.log('Popup: Script loaded completely');