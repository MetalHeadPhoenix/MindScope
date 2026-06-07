// renderer.js - Complete with nested subfields support and fixed import/export

let currentZoom = 1;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
let currentTaskContext = null;
let currentStepContext = null;
let userData = { fields: [] };
let currentDeleteFieldName = null;
let currentDeleteSubfieldInfo = null;

const stateConfig = {
    'new': { icon: '🟢', label: 'New', color: '#10b981' },
    'in_progress': { icon: '🟡', label: 'In Progress', color: '#f59e0b' },
    'pending': { icon: '🟠', label: 'Pending', color: '#f97316' },
    'completed': { icon: '✅', label: 'Completed', color: '#22c55e' }
};

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('mindscope_data');
    if (saved) {
        userData = JSON.parse(saved);
        // Ensure fields array exists
        if (!userData.fields) {
            userData.fields = [];
        }
    } else {
        // Demo data
        userData = {
            fields: [
                {
                    name: "Cloud Engineering",
                    color: "#2563eb",
                    lightColor: "#eff6ff",
                    icon: "☁️",
                    subfields: [
                        {
                            name: "Network",
                            icon: "🌐",
                            steps: [
                                { name: "Network+", emoji: "📡", state: "new", note: "", completed: false, created_at: new Date().toISOString() },
                                { name: "CCNA", emoji: "🔌", state: "in_progress", note: "Studying routing protocols", completed: false, created_at: new Date().toISOString() }
                            ]
                        },
                        {
                            name: "DevOps Tools",
                            icon: "🔧",
                            steps: [
                                { name: "Docker", emoji: "🐳", state: "completed", note: "Certified", completed: true, created_at: new Date().toISOString() },
                                { name: "Kubernetes", emoji: "☸️", state: "in_progress", note: "Learning pods", completed: false, created_at: new Date().toISOString() }
                            ]
                        },
                        {
                            name: "Programming",
                            icon: "💻",
                            steps: [],
                            subfields: [
                                {
                                    name: "Backend",
                                    icon: "⚙️",
                                    steps: [
                                        { name: "Python", emoji: "🐍", state: "completed", note: "", completed: true, created_at: new Date().toISOString() },
                                        { name: "Node.js", emoji: "💚", state: "in_progress", note: "", completed: false, created_at: new Date().toISOString() }
                                    ]
                                },
                                {
                                    name: "Frontend",
                                    icon: "🎨",
                                    steps: [
                                        { name: "React", emoji: "⚛️", state: "in_progress", note: "", completed: false, created_at: new Date().toISOString() }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    name: "Music",
                    color: "#ea580c",
                    lightColor: "#fff7ed",
                    icon: "🎵",
                    subfields: [
                        {
                            name: "Theory",
                            icon: "🎼",
                            steps: [
                                { name: "Basics", emoji: "🎵", state: "completed", note: "", completed: true, created_at: new Date().toISOString() },
                                { name: "Harmony", emoji: "🎶", state: "in_progress", note: "", completed: false, created_at: new Date().toISOString() }
                            ]
                        },
                        {
                            name: "Playing",
                            icon: "🎸",
                            steps: [
                                { name: "Technique", emoji: "🖐️", state: "in_progress", note: "", completed: false, created_at: new Date().toISOString() }
                            ]
                        }
                    ]
                }
            ]
        };
    }
    renderMap();
}

function saveData() {
    localStorage.setItem('mindscope_data', JSON.stringify(userData));
}

function collectSubfieldPaths(subfields, currentPath = [], result = []) {
    for (let i = 0; i < subfields.length; i++) {
        const sub = subfields[i];
        const path = [...currentPath, i];
        result.push({ name: sub.name, icon: sub.icon, path: path.join(',') });
        if (sub.subfields && sub.subfields.length > 0) {
            collectSubfieldPaths(sub.subfields, path, result);
        }
    }
    return result;
}

function renderSubfields(subfields, fieldColor, level, fieldName, parentPath) {
    let html = '';
    for (let i = 0; i < subfields.length; i++) {
        const subfield = subfields[i];
        const currentPath = parentPath ? parentPath + ',' + i : '' + i;
        const indent = level * 1.5;
        
        html += '<div class="subfield-row" style="margin-left: ' + indent + 'rem;">';
        html += '<div class="subfield-label" style="background: ' + fieldColor + '10; color: ' + fieldColor + '; border: 1px solid ' + fieldColor + '20;">';
        html += '<span>' + (subfield.icon || '📌') + ' ' + (subfield.name || '') + '</span>';
        html += '<button class="delete-subfield-btn" onclick="event.stopPropagation(); openDeleteSubfieldModal(\'' + fieldName + '\', \'' + currentPath + '\', \'' + (subfield.name || '').replace(/'/g, "\\'") + '\')" title="Delete subfield">🗑️</button>';
        html += '</div>';
        
        if (subfield.subfields && subfield.subfields.length > 0) {
            html += '<div class="subfield-steps">';
            html += '<div class="nested-container">';
            html += renderSubfields(subfield.subfields, fieldColor, level + 1, fieldName, currentPath);
            html += '</div>';
            html += '</div>';
        } else {
            const steps = subfield.steps || [];
            html += '<div class="subfield-steps">';
            html += '<div class="steps-horizontal">';
            
            for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
                const step = steps[stepIdx];
                let stepClass = 'step';
                let circleContent = step.emoji || '📌';
                let circleBg = 'white';
                let circleBorder = fieldColor;
                
                if (step.state === 'completed') {
                    stepClass += ' step-completed';
                    circleBg = '#22c55e';
                    circleBorder = '#15803d';
                    circleContent = '✓';
                } else if (step.state === 'in_progress') {
                    stepClass += ' step-in-progress';
                    circleBg = '#fef3c7';
                    circleBorder = '#f59e0b';
                } else if (step.state === 'pending') {
                    stepClass += ' step-pending';
                    circleBg = '#fff7ed';
                    circleBorder = '#f97316';
                } else {
                    stepClass += ' step-new';
                    circleBg = 'white';
                    circleBorder = '#cbd5e1';
                }
                
                const stateInfo = stateConfig[step.state] || stateConfig['new'];
                const notePreview = (step.note && step.note.trim()) ? step.note.substring(0, 80) + (step.note.length > 80 ? '...' : '') : 'No note added';
                
                html += '<div class="' + stepClass + '" onclick="openStepModal(\'' + fieldName + '\', \'' + currentPath + '\', ' + stepIdx + ')">';
                html += '<div class="step-circle" style="background: ' + circleBg + '; border: 2px solid ' + circleBorder + '">' + circleContent + '</div>';
                html += '<div class="step-name">' + (step.name || '') + '</div>';
                html += '<div class="step-tooltip"><strong>' + stateInfo.icon + ' ' + (step.name || '') + '</strong><div class="tooltip-note">📝 ' + notePreview + '</div></div>';
                html += '</div>';
                
                if (stepIdx < steps.length - 1) {
                    html += '<div class="step-connector"></div>';
                }
            }
            
            if (steps.length > 0) {
                html += '<div class="step-connector"></div>';
            }
            
            html += '<div class="add-step-btn" onclick="openAddTaskModal(\'' + fieldName + '\', \'' + currentPath + '\')">+</div>';
            html += '</div>';
            html += '</div>';
        }
        html += '</div>';
    }
    return html;
}

function renderMap() {
    const container = document.getElementById('metroMap');
    if (!container) return;
    
    if (!userData.fields || userData.fields.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🧠</div><h3>Your Mind is Empty</h3><p>Click the <strong>➕ Field</strong> button above to start organizing your learning journey.</p><button class="btn-primary" onclick="openAddFieldModal()">Create Your First Field</button></div>';
        saveData();
        return;
    }
    
    let html = '';
    for (let field of userData.fields) {
        html += '<div class="field-row">';
        html += '<div class="field-label" style="background: ' + (field.lightColor || '#f8fafc') + '; color: ' + (field.color || '#219ebc') + '; border-right-color: ' + (field.color || '#219ebc') + '30;">';
        html += '<span style="font-size: 1.2rem;">' + (field.icon || '📁') + '</span> ' + (field.name || '');
        html += '<button class="delete-field-btn" onclick="event.stopPropagation(); openDeleteFieldModal(\'' + (field.name || '').replace(/'/g, "\\'") + '\')" title="Delete field">🗑️</button>';
        html += '</div>';
        html += '<div class="field-content">' + renderSubfields(field.subfields || [], field.color || '#219ebc', 0, field.name || '', '') + '</div></div>';
    }
    container.innerHTML = html;
    applyZoom();
    saveData();
}

// Modal Functions
function openAddFieldModal() {
    document.getElementById('addFieldModal').style.display = 'flex';
    document.getElementById('fieldName').focus();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addField() {
    const fieldName = document.getElementById('fieldName').value.trim();
    const fieldIcon = document.getElementById('fieldIcon').value;
    const fieldColor = document.getElementById('fieldColor').value;
    
    if (!fieldName) {
        alert('Please enter a field name');
        return;
    }
    
    // Initialize userData.fields if it doesn't exist
    if (!userData) {
        userData = { fields: [] };
    }
    if (!userData.fields) {
        userData.fields = [];
    }
    
    userData.fields.push({
        name: fieldName,
        color: fieldColor,
        lightColor: fieldColor + '10',
        icon: fieldIcon,
        subfields: []
    });
    
    saveData();
    renderMap();
    closeModal('addFieldModal');
    document.getElementById('fieldName').value = '';
}

function openAddSubfieldModal() {
    const select = document.getElementById('subfieldFieldName');
    select.innerHTML = '';
    if (!userData.fields || userData.fields.length === 0) {
        alert('Please create a field first before adding subfields.');
        return;
    }
    for (let field of userData.fields) {
        const option = document.createElement('option');
        option.value = field.name;
        option.textContent = (field.icon || '📁') + ' ' + (field.name || '');
        select.appendChild(option);
    }
    document.getElementById('addSubfieldModal').style.display = 'flex';
}

function addSubfield() {
    const fieldName = document.getElementById('subfieldFieldName').value;
    const subfieldName = document.getElementById('subfieldName').value.trim();
    const subfieldIcon = document.getElementById('subfieldIcon').value;
    
    if (!subfieldName) {
        alert('Please enter a subfield name');
        return;
    }
    
    // Ensure userData and fields exist
    if (!userData || !userData.fields) {
        alert('Please create a field first');
        return;
    }
    
    const field = userData.fields.find(f => f.name === fieldName);
    if (field) {
        if (!field.subfields) {
            field.subfields = [];
        }
        field.subfields.push({
            name: subfieldName,
            icon: subfieldIcon,
            steps: [],
            subfields: []
        });
        saveData();
        renderMap();
        closeModal('addSubfieldModal');
        document.getElementById('subfieldName').value = '';
    }
}

function openAddNestedSubfieldModal() {
    const fieldSelect = document.getElementById('nestedFieldName');
    fieldSelect.innerHTML = '';
    if (!userData.fields || userData.fields.length === 0) {
        alert('Please create a field first before adding nested subfields.');
        return;
    }
    for (let field of userData.fields) {
        const option = document.createElement('option');
        option.value = field.name;
        option.textContent = (field.icon || '📁') + ' ' + (field.name || '');
        fieldSelect.appendChild(option);
    }
    updateParentSubfieldSelect();
    document.getElementById('addNestedSubfieldModal').style.display = 'flex';
}

function updateParentSubfieldSelect() {
    const fieldName = document.getElementById('nestedFieldName').value;
    const select = document.getElementById('parentSubfieldPath');
    if (!select) return;
    select.innerHTML = '<option value="">-- Root Level (under field) --</option>';
    const field = userData.fields.find(f => f.name === fieldName);
    if (field && field.subfields) {
        const paths = collectSubfieldPaths(field.subfields);
        for (const p of paths) {
            const option = document.createElement('option');
            option.value = p.path;
            const indent = '  '.repeat(p.path.split(',').length);
            option.textContent = indent + p.icon + ' ' + p.name;
            select.appendChild(option);
        }
    }
}

function addNestedSubfield() {
    const fieldName = document.getElementById('nestedFieldName').value;
    const parentPath = document.getElementById('parentSubfieldPath').value;
    const subfieldName = document.getElementById('nestedSubfieldName').value.trim();
    const subfieldIcon = document.getElementById('nestedSubfieldIcon').value;
    
    if (!subfieldName) {
        alert('Please enter a subfield name');
        return;
    }
    
    if (!userData || !userData.fields) {
        alert('Please create a field first');
        return;
    }
    
    const field = userData.fields.find(f => f.name === fieldName);
    if (field) {
        if (!field.subfields) {
            field.subfields = [];
        }
        if (parentPath) {
            const pathParts = parentPath.split(',').map(Number);
            let current = field.subfields;
            for (let i = 0; i < pathParts.length; i++) {
                if (!current[pathParts[i]]) {
                    alert('Parent subfield not found');
                    return;
                }
                if (!current[pathParts[i]].subfields) {
                    current[pathParts[i]].subfields = [];
                }
                if (i === pathParts.length - 1) {
                    current[pathParts[i]].subfields.push({
                        name: subfieldName,
                        icon: subfieldIcon,
                        steps: [],
                        subfields: []
                    });
                } else {
                    current = current[pathParts[i]].subfields;
                }
            }
        } else {
            field.subfields.push({
                name: subfieldName,
                icon: subfieldIcon,
                steps: [],
                subfields: []
            });
        }
        saveData();
        renderMap();
        closeModal('addNestedSubfieldModal');
        document.getElementById('nestedSubfieldName').value = '';
    }
}

function openAddTaskModal(fieldName, subfieldPath) {
    currentTaskContext = { fieldName, subfieldPath };
    document.getElementById('taskModal').style.display = 'flex';
    document.getElementById('taskName').focus();
}

function addTask() {
    const taskName = document.getElementById('taskName').value.trim();
    const taskIcon = document.getElementById('taskIcon').value;
    
    if (!taskName) {
        alert('Please enter a task name');
        return;
    }
    
    if (currentTaskContext) {
        const field = userData.fields.find(f => f.name === currentTaskContext.fieldName);
        if (field && currentTaskContext.subfieldPath) {
            const pathParts = currentTaskContext.subfieldPath.split(',').map(Number);
            let current = field.subfields;
            for (let i = 0; i < pathParts.length - 1; i++) {
                if (!current[pathParts[i]] || !current[pathParts[i]].subfields) {
                    alert('Subfield not found');
                    return;
                }
                current = current[pathParts[i]].subfields;
            }
            const target = current[pathParts[pathParts.length - 1]];
            if (target) {
                if (!target.steps) target.steps = [];
                target.steps.push({
                    name: taskName,
                    emoji: taskIcon,
                    state: 'new',
                    note: '',
                    completed: false,
                    created_at: new Date().toISOString()
                });
                saveData();
                renderMap();
                closeModal('taskModal');
                document.getElementById('taskName').value = '';
            }
        }
    }
}

function openStepModal(fieldName, subfieldPath, stepIndex) {
    currentStepContext = { fieldName, subfieldPath, stepIndex };
    const field = userData.fields.find(f => f.name === fieldName);
    if (field && subfieldPath) {
        const pathParts = subfieldPath.split(',').map(Number);
        let current = field.subfields;
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]] || !current[pathParts[i]].subfields) {
                alert('Subfield not found');
                return;
            }
            current = current[pathParts[i]].subfields;
        }
        const target = current[pathParts[pathParts.length - 1]];
        if (target && target.steps && target.steps[stepIndex]) {
            const step = target.steps[stepIndex];
            document.getElementById('stepModalTitle').innerHTML = '📝 ' + step.name;
            document.getElementById('stepState').value = step.state || 'new';
            document.getElementById('stepNote').value = step.note || '';
            
            const datesContainer = document.getElementById('stepDatesContainer');
            if (datesContainer) {
                let datesHtml = '<div style="display: flex; flex-direction: column; gap: 0.3rem;">';
                if (step.created_at) {
                    datesHtml += `<div>📅 Created: ${new Date(step.created_at).toLocaleString()}</div>`;
                }
                if (step.started_at) {
                    datesHtml += `<div>▶️ Started: ${new Date(step.started_at).toLocaleString()}</div>`;
                }
                if (step.completed_at) {
                    datesHtml += `<div>✅ Completed: ${new Date(step.completed_at).toLocaleString()}</div>`;
                }
                datesHtml += '</div>';
                datesContainer.innerHTML = datesHtml;
            }
            
            document.getElementById('stepModal').style.display = 'flex';
        }
    }
}

function saveStepDetails() {
    const state = document.getElementById('stepState').value;
    const note = document.getElementById('stepNote').value;
    const now = new Date().toISOString();
    
    const field = userData.fields.find(f => f.name === currentStepContext.fieldName);
    if (field && currentStepContext.subfieldPath) {
        const pathParts = currentStepContext.subfieldPath.split(',').map(Number);
        let current = field.subfields;
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]] || !current[pathParts[i]].subfields) {
                alert('Subfield not found');
                return;
            }
            current = current[pathParts[i]].subfields;
        }
        const target = current[pathParts[pathParts.length - 1]];
        if (target && target.steps && target.steps[currentStepContext.stepIndex]) {
            const step = target.steps[currentStepContext.stepIndex];
            const oldState = step.state;
            step.state = state;
            step.note = note;
            step.completed = (state === 'completed');
            step.last_updated = now;
            
            if (state === 'in_progress' && oldState !== 'in_progress' && !step.started_at) {
                step.started_at = now;
            }
            if (state === 'completed' && oldState !== 'completed') {
                step.completed_at = now;
            }
            saveData();
            renderMap();
            closeModal('stepModal');
        }
    }
}

function deleteCurrentStep() {
    if (confirm('Are you sure you want to delete this step?')) {
        const field = userData.fields.find(f => f.name === currentStepContext.fieldName);
        if (field && currentStepContext.subfieldPath) {
            const pathParts = currentStepContext.subfieldPath.split(',').map(Number);
            let current = field.subfields;
            for (let i = 0; i < pathParts.length - 1; i++) {
                if (!current[pathParts[i]] || !current[pathParts[i]].subfields) {
                    return;
                }
                current = current[pathParts[i]].subfields;
            }
            const target = current[pathParts[pathParts.length - 1]];
            if (target && target.steps) {
                target.steps.splice(currentStepContext.stepIndex, 1);
                saveData();
                renderMap();
                closeModal('stepModal');
            }
        }
    }
}

function openDeleteFieldModal(fieldName) {
    currentDeleteFieldName = fieldName;
    document.getElementById('deleteFieldName').textContent = fieldName;
    document.getElementById('deleteFieldModal').style.display = 'flex';
}

function confirmDeleteField() {
    const index = userData.fields.findIndex(f => f.name === currentDeleteFieldName);
    if (index !== -1) {
        userData.fields.splice(index, 1);
        saveData();
        renderMap();
        closeModal('deleteFieldModal');
    }
}

function openDeleteSubfieldModal(fieldName, subfieldPath, subfieldName) {
    currentDeleteSubfieldInfo = { fieldName, subfieldPath, subfieldName };
    document.getElementById('deleteSubfieldName').textContent = subfieldName;
    document.getElementById('deleteSubfieldModal').style.display = 'flex';
}

function confirmDeleteSubfield() {
    const field = userData.fields.find(f => f.name === currentDeleteSubfieldInfo.fieldName);
    if (field && currentDeleteSubfieldInfo.subfieldPath) {
        const pathParts = currentDeleteSubfieldInfo.subfieldPath.split(',').map(Number);
        let current = field.subfields;
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]] || !current[pathParts[i]].subfields) {
                return;
            }
            current = current[pathParts[i]].subfields;
        }
        current.splice(pathParts[pathParts.length - 1], 1);
        saveData();
        renderMap();
        closeModal('deleteSubfieldModal');
    }
}

// Fixed Export/Import functions
async function exportData() {
    try {
        const dataStr = JSON.stringify(userData, null, 2);
        const result = await window.electron.exportData(dataStr);
        
        if (result && result.success) {
            alert('✅ Data exported successfully to:\n' + result.path);
        } else if (result && result.error) {
            alert('❌ Export failed: ' + result.error);
        } else {
            alert('❌ Export cancelled or failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('❌ Export error: ' + error.message);
    }
}

async function importData() {
    try {
        const result = await window.electron.importData();
        
        if (!result) {
            alert('❌ Import failed: No response from main process');
            return;
        }
        
        if (!result.success) {
            alert('❌ Import failed: ' + (result.error || 'Unknown error'));
            return;
        }
        
        if (!result.data) {
            alert('❌ Import failed: No data in file');
            return;
        }
        
        // Get the imported data (should already be parsed by main process)
        let importedData = result.data;
        
        // If it's still a string, parse it
        if (typeof importedData === 'string') {
            try {
                importedData = JSON.parse(importedData);
            } catch (parseError) {
                alert('❌ Import failed: Could not parse JSON data');
                return;
            }
        }
        
        // Ensure fields array exists
        if (!importedData.fields) {
            importedData.fields = [];
        }
        
        // Make sure each field has required properties
        for (let field of importedData.fields) {
            if (!field.subfields) field.subfields = [];
            if (!field.color) field.color = '#219ebc';
            if (!field.lightColor) field.lightColor = field.color + '10';
            if (!field.icon) field.icon = '📁';
        }
        
        // Replace current data with imported data
        userData = importedData;
        saveData();
        renderMap();
        
        alert('✅ Data imported successfully!\n\n' + 
              'File: ' + result.path + '\n' +
              'Fields: ' + userData.fields.length);
              
    } catch (error) {
        console.error('Import error:', error);
        alert('❌ Import error: ' + error.message);
    }
}

// Zoom functions
function applyZoom() {
    const mapInner = document.getElementById('mapInner');
    if (mapInner) mapInner.style.transform = 'scale(' + currentZoom + ')';
}

function zoomIn() {
    if (currentZoom < MAX_ZOOM) {
        currentZoom = Math.min(currentZoom + 0.1, MAX_ZOOM);
        applyZoom();
    }
}

function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
        currentZoom = Math.max(currentZoom - 0.1, MIN_ZOOM);
        applyZoom();
    }
}

function zoomReset() {
    currentZoom = 1;
    applyZoom();
    const sc = document.getElementById('mapScrollContainer');
    if (sc) { sc.scrollTop = 0; sc.scrollLeft = 0; }
}

function fitToContainer() {
    const mapInner = document.getElementById('mapInner');
    const scrollContainer = document.getElementById('mapScrollContainer');
    if (!mapInner || !scrollContainer) return;
    const fitZoom = Math.min(Math.max((scrollContainer.clientWidth - 40) / mapInner.scrollWidth, MIN_ZOOM), MAX_ZOOM);
    currentZoom = fitZoom;
    applyZoom();
    scrollContainer.scrollTop = 0;
    scrollContainer.scrollLeft = 0;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    document.getElementById('zoomInBtn')?.addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn')?.addEventListener('click', zoomOut);
    document.getElementById('zoomResetBtn')?.addEventListener('click', zoomReset);
    document.getElementById('zoomFitBtn')?.addEventListener('click', fitToContainer);
    document.getElementById('addFieldBtn')?.addEventListener('click', openAddFieldModal);
    document.getElementById('addSubfieldBtn')?.addEventListener('click', openAddSubfieldModal);
    document.getElementById('addNestedSubfieldBtn')?.addEventListener('click', openAddNestedSubfieldModal);
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', importData);
    
    // Fix for nested subfield selection to update subfield list
    document.getElementById('nestedFieldName')?.addEventListener('change', updateParentSubfieldSelect);
});

// Make functions global
window.closeModal = closeModal;
window.addField = addField;
window.addSubfield = addSubfield;
window.addNestedSubfield = addNestedSubfield;
window.addTask = addTask;
window.openAddTaskModal = openAddTaskModal;
window.openStepModal = openStepModal;
window.saveStepDetails = saveStepDetails;
window.deleteCurrentStep = deleteCurrentStep;
window.openDeleteFieldModal = openDeleteFieldModal;
window.confirmDeleteField = confirmDeleteField;
window.openDeleteSubfieldModal = openDeleteSubfieldModal;
window.confirmDeleteSubfield = confirmDeleteSubfield;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.zoomReset = zoomReset;
window.fitToContainer = fitToContainer;
window.exportData = exportData;
window.importData = importData;
window.openAddFieldModal = openAddFieldModal;
window.openAddSubfieldModal = openAddSubfieldModal;
window.openAddNestedSubfieldModal = openAddNestedSubfieldModal;
window.updateParentSubfieldSelect = updateParentSubfieldSelect;