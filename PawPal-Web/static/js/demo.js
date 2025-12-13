// Sprint 2 Demo Functions

// Check service status
async function checkServiceStatus() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        const statusDiv = document.getElementById('serviceStatus');
        if (statusDiv) {
            const compositeStatus = data.dependencies?.composite_service || 'unknown';
            const statusColor = compositeStatus === 'healthy' ? 'green' : 'red';
            
            statusDiv.innerHTML = `
                <div>Web App: <span style="color: green;">✓ Running</span></div>
                <div>Composite Service (Port 3002): <span style="color: ${statusColor};">${compositeStatus === 'healthy' ? '✓ Healthy' : '✗ Unavailable'}</span></div>
                <div style="margin-top: 0.5rem; font-size: 0.9em; color: #666;">
                    Make sure composite-service is running on port 3002<br>
                    User service should be running on port 3001
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to check service status:', error);
    }
}

// Test Foreign Key Validation
async function testForeignKeyValidation() {
    const ownerId = document.getElementById('demoOwnerId').value;
    const dogName = document.getElementById('demoDogName').value;
    const resultDiv = document.getElementById('foreignKeyResult');
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="spinner"></div> Testing foreign key validation...';
    
    try {
        const response = await fetch('/api/pets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner_id: parseInt(ownerId),
                name: dogName,
                breed: 'Test Breed',
                size: 'medium'
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = `
                <div style="color: green;">
                    <strong>✓ Success!</strong><br>
                    Dog created successfully. Owner ID ${ownerId} exists.<br>
                    <pre>${JSON.stringify(result, null, 2)}</pre>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: red;">
                    <strong>✗ Validation Failed (Expected)</strong><br>
                    ${result.message}<br>
                    <small>This is the expected behavior - dogs cannot be created with invalid owner IDs!</small>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="color: red;">
                <strong>Error:</strong> ${error.message}<br>
                <small>Make sure the composite service is running on port 3002</small>
            </div>
        `;
    }
}

// Test Parallel Execution
async function testParallelExecution() {
    const userId = document.getElementById('parallelUserId').value;
    const timingDiv = document.getElementById('parallelTiming');
    const dataDiv = document.getElementById('parallelData');
    
    timingDiv.style.display = 'block';
    dataDiv.style.display = 'block';
    
    timingDiv.innerHTML = '<div class="spinner"></div> Fetching data in parallel...';
    dataDiv.innerHTML = '';
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(`/api/demo/user-complete/${userId}`);
        const result = await response.json();
        
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(2);
        
        if (response.ok) {
            timingDiv.innerHTML = `
                <div style="color: green;">
                    <strong>✓ Parallel Execution Complete</strong><br>
                    Total time: ${duration}ms<br>
                    <small>User data, dogs, and stats were fetched simultaneously using worker threads!</small>
                </div>
            `;
            
            dataDiv.innerHTML = `
                <strong>Retrieved Data:</strong>
                <pre>${JSON.stringify(result, null, 2)}</pre>
            `;
        } else {
            timingDiv.innerHTML = `
                <div style="color: red;">
                    <strong>Error:</strong> ${result.message || 'Failed to fetch data'}
                </div>
            `;
        }
    } catch (error) {
        timingDiv.innerHTML = `
            <div style="color: red;">
                <strong>Error:</strong> ${error.message}<br>
                <small>Make sure the composite service is running on port 3002</small>
            </div>
        `;
    }
}

// Test Cascade Delete
async function testCascadeDelete() {
    const userId = document.getElementById('cascadeUserId').value;
    const resultDiv = document.getElementById('cascadeResult');
    
    if (!confirm(`Are you sure you want to delete user ${userId} and all their dogs? This is for demo purposes.`)) {
        return;
    }
    
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="spinner"></div> Performing cascade delete...';
    
    try {
        const response = await fetch(`/api/demo/cascade-delete/${userId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = `
                <div style="color: green;">
                    <strong>✓ Cascade Delete Successful</strong><br>
                    ${result.message}<br>
                    <pre>${JSON.stringify(result.data, null, 2)}</pre>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="color: orange;">
                    <strong>Note:</strong> ${result.message || 'User may not exist or already deleted'}<br>
                    <small>Try with a different user ID that exists in the database</small>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="color: red;">
                <strong>Error:</strong> ${error.message}<br>
                <small>Make sure the composite service is running on port 3002</small>
            </div>
        `;
    }
}

// Load Aggregated Statistics
async function loadAggregatedStats() {
    const statsDiv = document.getElementById('compositeStats');
    
    statsDiv.style.display = 'block';
    statsDiv.innerHTML = '<div class="spinner"></div> Loading aggregated statistics...';
    
    try {
        const response = await fetch('/api/demo/composite-stats');
        const result = await response.json();
        
        if (response.ok) {
            const stats = result.data || result;
            statsDiv.innerHTML = `
                <strong>Aggregated Statistics from All Services:</strong>
                <pre>${JSON.stringify(stats, null, 2)}</pre>
                <div style="margin-top: 1rem; padding: 0.5rem; background: #e8f5e9; border-radius: 5px;">
                    <small>This data is aggregated from multiple atomic services through the composite service!</small>
                </div>
            `;
        } else {
            statsDiv.innerHTML = `
                <div style="color: red;">
                    <strong>Error:</strong> Failed to load statistics<br>
                    ${result.error || result.message}
                </div>
            `;
        }
    } catch (error) {
        statsDiv.innerHTML = `
            <div style="color: red;">
                <strong>Error:</strong> ${error.message}<br>
                <small>Make sure the composite service is running on port 3002</small>
            </div>
        `;
    }
}

// Auto-check service status when demo page is shown
document.addEventListener('DOMContentLoaded', function() {
    const originalShowPage = window.showPage;
    window.showPage = function(pageId) {
        originalShowPage(pageId);
        if (pageId === 'demo') {
            checkServiceStatus();
        }
    };
});

// Add spinner CSS if not already present
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
    .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #4A90E2;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinnerStyle);
