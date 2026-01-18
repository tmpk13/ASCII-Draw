let rows = 30;
let cols = 50;
let focusedRow = 0;
let focusedCol = 0;
let tiles = [];
let history = [];
let maxHistory = 50;
let branches = {};
let activeBranch = 'main';

// Selection state
let isSelecting = false;
let selectionStart = null;
let selectionEnd = null;
let selectedTiles = new Set();
let isDraggingSelection = false;
let dragStartPos = null;
let anchorPos = null; // For shift+click/arrow selection

// Playback state
let isPlaying = false;
let playbackTimer = null;
let currentPlayIndex = 0;

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  const states = branches[activeBranch] || [];
  if (states.length === 0) return;
  
  isPlaying = true;
  currentPlayIndex = 0;
  document.getElementById('playBtn').textContent = '⏸ Stop';
  
  playNextState();
}

function playNextState() {
  const states = branches[activeBranch] || [];
  
  if (currentPlayIndex >= states.length) {
    const shouldLoop = document.getElementById('loopPlay').checked;
    if (shouldLoop) {
      currentPlayIndex = 0;
    } else {
      stopPlayback();
      return;
    }
  }
  
  loadGridState(currentPlayIndex);
  currentPlayIndex++;
  
  const interval = parseInt(document.getElementById('playInterval').value) || 500;
  playbackTimer = setTimeout(playNextState, interval);
}

function stopPlayback() {
  isPlaying = false;
  if (playbackTimer) {
    clearTimeout(playbackTimer);
    playbackTimer = null;
  }
  document.getElementById('playBtn').textContent = '▶ Play';
  currentPlayIndex = 0;
}

function loadFromStorage() {
  const saved = localStorage.getItem('textGrid');
  if (saved) {
    const data = JSON.parse(saved);
    branches = data.branches || { main: [] };
    activeBranch = data.activeBranch || 'main';
    
    if (data.currentGrid) {
      rows = data.currentGrid.rows;
      cols = data.currentGrid.cols;
      document.getElementById('rows').value = rows;
      document.getElementById('cols').value = cols;
      
      createGrid();
      
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const char = data.currentGrid.grid[r][c];
          // Ensure only single character or space
          tiles[r][c].textContent = char.length > 0 ? char[0] : ' ';
        }
      }
      focusTile(0, 0);
    }
  } else {
    branches = { main: [] };
  }
  renderTabs();
  renderSavedStates();
}

function saveToStorage() {
  const currentGrid = [];
  for (let r = 0; r < rows; r++) {
    currentGrid[r] = [];
    for (let c = 0; c < cols; c++) {
      const char = tiles[r][c].textContent;
      // Ensure we only save single character or space
      currentGrid[r][c] = char.length > 0 ? char[0] : ' ';
    }
  }
  
  const data = {
    branches: branches,
    activeBranch: activeBranch,
    currentGrid: {
      grid: currentGrid,
      rows: rows,
      cols: cols
    }
  };
  
  localStorage.setItem('textGrid', JSON.stringify(data));
  updatePreview();
}

function saveState() {
  const state = [];
  for (let r = 0; r < rows; r++) {
    state[r] = [];
    for (let c = 0; c < cols; c++) {
      const char = tiles[r][c].textContent;
      // Ensure we only save single character or space
      state[r][c] = char.length > 0 ? char[0] : ' ';
    }
  }
  history.push({ grid: state, row: focusedRow, col: focusedCol });
  if (history.length > maxHistory) history.shift();
  updateUndoButton();
}

function undo() {
  if (history.length === 0) return;
  const state = history.pop();
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const char = state.grid[r][c];
      // Ensure only single character or space
      tiles[r][c].textContent = char.length > 0 ? char[0] : ' ';
    }
  }
  focusTile(state.row, state.col);
  updateUndoButton();
  saveToStorage();
}

function updateUndoButton() {
  document.getElementById('undoBtn').disabled = history.length === 0;
}

function createNewBranch() {
  const name = prompt('Branch name:', `branch-${Object.keys(branches).length + 1}`);
  if (!name || name.trim() === '') return;
  
  branches[name] = [];
  activeBranch = name;
  renderTabs();
  renderSavedStates();
  saveToStorage();
}

function switchBranch(name) {
  activeBranch = name;
  renderTabs();
  renderSavedStates();
  saveToStorage();
}

function deleteBranch(name) {
  if (name === 'main') {
    alert('Cannot delete main branch');
    return;
  }
  
  if (confirm(`Delete branch "${name}"?`)) {
    delete branches[name];
    if (activeBranch === name) {
      activeBranch = 'main';
    }
    renderTabs();
    renderSavedStates();
    saveToStorage();
  }
}

function renderTabs() {
  const container = document.getElementById('tabsContainer');
  container.innerHTML = '';
  
  Object.keys(branches).forEach(name => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (name === activeBranch ? ' active' : '');
    
    const label = document.createElement('span');
    label.textContent = name;
    tab.appendChild(label);
    
    if (name !== 'main') {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.textContent = '×';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        deleteBranch(name);
      };
      tab.appendChild(closeBtn);
    }
    
    tab.onclick = () => switchBranch(name);
    container.appendChild(tab);
  });
  
  const newBtn = document.createElement('button');
  newBtn.className = 'new-tab-btn';
  newBtn.textContent = '+';
  newBtn.onclick = createNewBranch;
  container.appendChild(newBtn);
}

function saveGridState() {
  const state = [];
  for (let r = 0; r < rows; r++) {
    state[r] = [];
    for (let c = 0; c < cols; c++) {
      const char = tiles[r][c].textContent;
      // Ensure we only save single character or space
      state[r][c] = char.length > 0 ? char[0] : ' ';
    }
  }
  
  const timestamp = new Date().toLocaleString();
  branches[activeBranch].push({
    grid: state,
    rows: rows,
    cols: cols,
    timestamp: timestamp
  });
  
  renderSavedStates();
  saveToStorage();
}

function loadGridState(index) {
  const state = branches[activeBranch][index];
  
  if (state.rows !== rows || state.cols !== cols) {
    document.getElementById('rows').value = state.rows;
    document.getElementById('cols').value = state.cols;
    createGrid();
  }
  
  saveState();
  
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const char = state.grid[r][c];
      // Ensure only single character or space
      tiles[r][c].textContent = char.length > 0 ? char[0] : ' ';
    }
  }
  
  focusTile(0, 0);
  saveToStorage();
}

function deleteGridState(index) {
  branches[activeBranch].splice(index, 1);
  renderSavedStates();
  saveToStorage();
}

function renderSavedStates() {
  const container = document.getElementById('statesList');
  container.innerHTML = '';
  
  const states = branches[activeBranch] || [];
  
  states.forEach((state, index) => {
    const item = document.createElement('div');
    item.className = 'state-item';
    
    const canvas = document.createElement('canvas');
    const previewWidth = 250;
    const previewHeight = Math.floor(previewWidth * (state.rows / state.cols));
    canvas.width = state.cols;
    canvas.height = state.rows;
    canvas.style.width = previewWidth + 'px';
    canvas.style.height = previewHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, state.cols, state.rows);
    ctx.fillStyle = '#2a2a2a';
    ctx.font = '1px monospace';
    
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const char = state.grid[r][c];
        if (char !== ' ') {
          ctx.fillText(char, c, r + 0.8);
        }
      }
    }
    
    const info = document.createElement('div');
    info.className = 'state-info';
    info.innerHTML = `
      <span>${state.timestamp}</span>
      <button class="state-delete" onclick="event.stopPropagation(); deleteGridState(${index})">Delete</button>
    `;
    
    item.appendChild(canvas);
    item.appendChild(info);
    item.onclick = () => loadGridState(index);
    
    container.appendChild(item);
  });
}

function clearSelection() {
  selectedTiles.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    tiles[r][c].classList.remove('highlighted');
  });
  selectedTiles.clear();
  selectionStart = null;
  selectionEnd = null;
}

function highlightSelection(r1, c1, r2, c2) {
  clearSelection();
  
  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);
  const minC = Math.min(c1, c2);
  const maxC = Math.max(c1, c2);
  
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const key = `${r},${c}`;
      selectedTiles.add(key);
      tiles[r][c].classList.add('highlighted');
    }
  }
}

function getSelectionBounds() {
  if (selectedTiles.size === 0) return null;
  
  let minR = Infinity, maxR = -Infinity;
  let minC = Infinity, maxC = -Infinity;
  
  selectedTiles.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minC = Math.min(minC, c);
    maxC = Math.max(maxC, c);
  });
  
  return { minR, maxR, minC, maxC };
}

function getSelectionText() {
  const bounds = getSelectionBounds();
  if (!bounds) return '';
  
  let text = '';
  for (let r = bounds.minR; r <= bounds.maxR; r++) {
    let line = '';
    for (let c = bounds.minC; c <= bounds.maxC; c++) {
      line += tiles[r][c].textContent;
    }
    // Trim trailing spaces
    line = line.replace(/\s+$/, '');
    text += line;
    if (r < bounds.maxR) text += '\n';
  }
  return text;
}

function cutSelection() {
  saveState();
  
  selectedTiles.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    tiles[r][c].textContent = ' ';
  });
  
  saveToStorage();
}

function createGrid() {
  rows = parseInt(document.getElementById('rows').value);
  cols = parseInt(document.getElementById('cols').value);
  
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cols}, 14px)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 20px)`;
  tiles = [];
  history = [];
  updateUndoButton();
  clearSelection();
  
  for (let r = 0; r < rows; r++) {
    tiles[r] = [];
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.textContent = ' ';
      tile.dataset.row = r;
      tile.dataset.col = c;
      
      tile.addEventListener('dblclick', () => {
        if (anchorPos) {
          selectArea(anchorPos.r, anchorPos.c, r, c);
        }
      });
      tile.addEventListener('mousedown', (e) => handleMouseDown(e, r, c));
      tile.addEventListener('mouseenter', (e) => handleMouseEnter(e, r, c));
      tile.addEventListener('mouseup', () => handleMouseUp());
            
      grid.appendChild(tile);
      tiles[r][c] = tile;
    }
  }
  
  document.addEventListener('mouseup', handleMouseUp);
  
  focusTile(0, 0);
  anchorPos = { r: 0, c: 0 };
}

function selectArea(x, y, w, h) {
  highlightSelection(x, y, w, h);
  focusTile(w, h);
}

function handleMouseDown(e, r, c) {
  if (e.ctrlKey || e.metaKey) {
    // Ctrl+click: toggle tile in selection
    const key = `${r},${c}`;
    if (selectedTiles.has(key)) {
      selectedTiles.delete(key);
      tiles[r][c].classList.remove('highlighted');
    } else {
      selectedTiles.add(key);
      tiles[r][c].classList.add('highlighted');
    }
    focusTile(r, c);
    e.preventDefault();
  } else if (e.shiftKey) {
    // Shift+click: extend selection from anchor
    if (anchorPos) {
      selectArea(anchorPos.r, anchorPos.c, r, c);
      // highlightSelection(anchorPos.r, anchorPos.c, r, c);
      // focusTile(r, c);
    }
  } else if (selectedTiles.has(`${r},${c}`)) {
    // Click on highlighted area: start drag
    isDraggingSelection = true;
    dragStartPos = { r, c };
  } else {
    // Normal click: start new selection
    isSelecting = true;
    selectionStart = { r, c };
    selectionEnd = { r, c };
    anchorPos = { r, c };
    highlightSelection(r, c, r, c);
    focusTile(r, c);
  }
}

function handleMouseEnter(e, r, c) {
  if (isSelecting) {
    selectionEnd = { r, c };
    highlightSelection(selectionStart.r, selectionStart.c, r, c);
  } else if (isDraggingSelection && dragStartPos) {
    // Preview drag position
  }
}

function handleMouseUp() {
  if (isDraggingSelection && dragStartPos) {
    const bounds = getSelectionBounds();
    if (!bounds) {
      isDraggingSelection = false;
      dragStartPos = null;
      return;
    }
    
    // Get current mouse position tile
    const hoveredTile = document.querySelector('.tile:hover');
    if (hoveredTile) {
      const targetR = parseInt(hoveredTile.dataset.row);
      const targetC = parseInt(hoveredTile.dataset.col);
      
      const offsetR = targetR - dragStartPos.r;
      const offsetC = targetC - dragStartPos.c;
      
      saveState();
      
      // Store selection content
      const dragData = [];
      for (let r = bounds.minR; r <= bounds.maxR; r++) {
        dragData[r - bounds.minR] = [];
        for (let c = bounds.minC; c <= bounds.maxC; c++) {
          dragData[r - bounds.minR][c - bounds.minC] = tiles[r][c].textContent;
        }
      }
      
      // Clear original selection
      selectedTiles.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        tiles[r][c].textContent = ' ';
      });
      
      // Paste at new location
      for (let r = 0; r < dragData.length; r++) {
        for (let c = 0; c < dragData[r].length; c++) {
          const newR = bounds.minR + r + offsetR;
          const newC = bounds.minC + c + offsetC;
          if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
            tiles[newR][newC].textContent = dragData[r][c];
          }
        }
      }
      
      // Update selection
      clearSelection();
      for (let r = 0; r < dragData.length; r++) {
        for (let c = 0; c < dragData[r].length; c++) {
          const newR = bounds.minR + r + offsetR;
          const newC = bounds.minC + c + offsetC;
          if (newR >= 0 && newR < rows && newC >= 0 && newC < cols) {
            selectedTiles.add(`${newR},${newC}`);
            tiles[newR][newC].classList.add('highlighted');
          }
        }
      }
      
      saveToStorage();
    }
  }
  
  isSelecting = false;
  isDraggingSelection = false;
  dragStartPos = null;
}

function focusTile(r, c, updateAnchor = false) {
  document.querySelectorAll('.tile').forEach(t => t.classList.remove('focused'));
  if (tiles[r] && tiles[r][c]) {
    tiles[r][c].classList.add('focused');
    focusedRow = r;
    focusedCol = c;
    if (updateAnchor) {
      anchorPos = { r, c };
    }
  }
}

function advanceCursor() {
  focusedCol++;
  if (focusedCol >= cols) {
    focusedCol = 0;
    focusedRow++;
    if (focusedRow >= rows) {
      focusedRow = rows - 1;
      focusedCol = cols - 1;
    }
  }
  focusTile(focusedRow, focusedCol, true);
}

function pasteAtTile(r, c) {
  navigator.clipboard.readText().then(text => {
    if (!text) return;
    
    saveState();
    
    // Fill selection with single character
    if (selectedTiles.size > 0 && text.length === 1) {
      const bounds = getSelectionBounds();
      selectedTiles.forEach(key => {
        const [tileR, tileC] = key.split(',').map(Number);
        tiles[tileR][tileC].textContent = text;
      });
      
      // Move cursor to end of selection
      if (bounds) {
        focusTile(bounds.maxR, bounds.maxC, true);
      }
      clearSelection();
      saveToStorage();
      return;
    }
    
    focusTile(r, c, true);
    
    let lastR = r;
    let lastC = c;
    
    for (let char of text) {
      if (lastR >= rows) break;
      
      if (char === '\n') {
        lastC = 0;
        lastR++;
      } else {
        tiles[lastR][lastC].textContent = char;
        lastC++;
        
        if (lastC >= cols) {
          lastC = c;
          lastR++;
        }
      }
    }
    
    // Move cursor to end of pasted content
    focusTile(lastR, lastC, true);
    saveToStorage();
  });
}

function copyText() {
  let text = '';
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      line += tiles[r][c].textContent;
    }
    // Trim trailing spaces
    line = line.replace(/\s+$/, '');
    text += line;
    if (r < rows - 1) text += '\n';
  }
  navigator.clipboard.writeText(text);
}

function clearGrid() {
  saveState();
  tiles.forEach(row => row.forEach(tile => tile.textContent = ' '));
  focusTile(0, 0, true);
  saveToStorage();
}

document.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  if (!text) return;
  
  saveState();
  
  // Fill selection with single character
  if (selectedTiles.size > 0 && text.length === 1) {
    const bounds = getSelectionBounds();
    selectedTiles.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      tiles[r][c].textContent = text;
    });
    
    // Move cursor to end of selection
    if (bounds) {
      focusTile(bounds.maxR, bounds.maxC, true);
    }
    clearSelection();
    saveToStorage();
    return;
  }
  
  let lastR = focusedRow;
  let lastC = focusedCol;
  
  for (let char of text) {
    if (lastR >= rows) break;
    
    if (char === '\n') {
      lastC = focusedCol;
      lastR++;
    } else {
      tiles[lastR][lastC].textContent = char;
      lastC++;
      
      if (lastC >= cols) {
        lastC = 0;
        lastR++;
      }
    }
  }
  
  // Move cursor to end of pasted content
  focusTile(lastR, lastC, true);
  saveToStorage();
});

document.addEventListener('keydown', (e) => {
  // Copy
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedTiles.size > 0) {
    const text = getSelectionText();
    navigator.clipboard.writeText(text);
    e.preventDefault();
  }
  
  // Cut
  else if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedTiles.size > 0) {
    const text = getSelectionText();
    navigator.clipboard.writeText(text);
    cutSelection();
    e.preventDefault();
  }
  
  // Delete selection
  else if (e.key === 'Delete' && selectedTiles.size > 0) {
    saveState();
    selectedTiles.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      tiles[r][c].textContent = ' ';
    });
    clearSelection();
    saveToStorage();
    e.preventDefault();
  }
  
  // Escape to clear selection
  else if (e.key === 'Escape') {
    clearSelection();
    e.preventDefault();
  }
  
  // Undo
  else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    undo();
    e.preventDefault();
  }
  
  // Play/stop with Enter
  else if (e.key === 'Enter') {
    togglePlayback();
    e.preventDefault();
  }
  
  // Arrow navigation with optional shift for selection
  else if (e.key === 'ArrowUp' && focusedRow > 0) {
    const newRow = focusedRow - 1;
    if (e.shiftKey && anchorPos) {
      highlightSelection(anchorPos.r, anchorPos.c, newRow, focusedCol);
    } else {
      clearSelection();
      anchorPos = { r: newRow, c: focusedCol };
    }
    focusTile(newRow, focusedCol);
    e.preventDefault();
  } else if (e.key === 'ArrowDown' && focusedRow < rows - 1) {
    const newRow = focusedRow + 1;
    if (e.shiftKey && anchorPos) {
      highlightSelection(anchorPos.r, anchorPos.c, newRow, focusedCol);
    } else {
      clearSelection();
      anchorPos = { r: newRow, c: focusedCol };
    }
    focusTile(newRow, focusedCol);
    e.preventDefault();
  } else if (e.key === 'ArrowLeft' && focusedCol > 0) {
    const newCol = focusedCol - 1;
    if (e.shiftKey && anchorPos) {
      highlightSelection(anchorPos.r, anchorPos.c, focusedRow, newCol);
    } else {
      clearSelection();
      anchorPos = { r: focusedRow, c: newCol };
    }
    focusTile(focusedRow, newCol);
    e.preventDefault();
  } else if (e.key === 'ArrowRight' && focusedCol < cols - 1) {
    const newCol = focusedCol + 1;
    if (e.shiftKey && anchorPos) {
      highlightSelection(anchorPos.r, anchorPos.c, focusedRow, newCol);
    } else {
      clearSelection();
      anchorPos = { r: focusedRow, c: newCol };
    }
    focusTile(focusedRow, newCol);
    e.preventDefault();
  }
  
  // Regular typing
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
    saveState();
    tiles[focusedRow][focusedCol].textContent = e.key;
    clearSelection();
    advanceCursor();
    saveToStorage();
    e.preventDefault();
  }
  
  // Backspace
  else if (e.key === 'Backspace') {
    saveState();
    tiles[focusedRow][focusedCol].textContent = ' ';
    clearSelection();
    if (focusedCol > 0) {
      focusTile(focusedRow, focusedCol - 1, true);
    } else if (focusedRow > 0) {
      focusTile(focusedRow - 1, cols - 1, true);
    }
    saveToStorage();
    e.preventDefault();
  }
});

setInterval(saveToStorage, 2000);

loadFromStorage();
if (tiles.length === 0) createGrid();


// Preview text
let showPreview = false;

function togglePreview() {
  showPreview = !showPreview;
  const preview = document.getElementById('preview');
  
  if (showPreview) {
    updatePreview();
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function updatePreview() {
  if (!showPreview) return;
  
  const preview = document.getElementById('preview');
  let text = '';
  
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      line += tiles[r][c].textContent;
    }
    text += line.replace(/\s+$/, '') + '\n';
  }
  
  preview.textContent = text;
}





function toggleElement(el) {
  el.style.display = ((el.style.display === 'none') ? 'block' : 'none');
}

let gridToggle = document.getElementById("characterGridToggle");
let grid = document.getElementById("copy-chars");


let gridWidth = grid.style.width;

gridToggle.addEventListener('click', (e) => {
  let invisible = grid.style.display === 'none';
  
  if (invisible) {
    grid.animate([
      { width: 0, opacity: 0 },
      { width: gridWidth*1.1 },
      { width: gridWidth, opacity: 1 }
    ], { duration: 300, easing: 'ease' });
    gridToggle.textContent = "<";
    grid.style.display = 'block';
  }
  else {
    let animationLength = 200;
    gridWidth = grid.style.width;
    grid.animate([
      { width: gridWidth, opacity: 1 },
      { width: 0, opacity: 0 }
      ], { duration: animationLength, easing: 'ease' });
    gridToggle.textContent = ">";
    setTimeout(()=>{ grid.style.display = 'none'; }, animationLength);
  }
});
