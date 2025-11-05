/*
 * Global JavaScript for the Second Brain app.
 * Handles theme toggling, navigation highlighting, and
 * provides helpers for storing and retrieving data from
 * localStorage. Each page may implement its own section-specific
 * logic inside the `window.addEventListener('DOMContentLoaded', ...)`.
 */

// Utility to get and set JSON values in localStorage
function getStorage(key, defaultValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : defaultValue;
    } catch (err) {
        return defaultValue;
    }
}

function setStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Theme management
function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    setStorage('theme', theme);
    updateThemeIcon(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;
    if (theme === 'dark') {
        // Moon icon
        icon.innerHTML = '<path d="M21 12.79A9 9 0 0111.21 3c0-.29 0-.58.03-.86a1 1 0 00-1.23-1.07 11 11 0 1012.02 12.02 1 1 0 00-1.07-1.23 9.05 9.05 0 01-.96.06z" />';
    } else {
        // Sun icon
        icon.innerHTML = '<circle cx="12" cy="12" r="5" /><path d="M12 1v2" /><path d="M12 21v2" /><path d="M4.22 4.22l1.42 1.42" /><path d="M18.36 18.36l1.42 1.42" /><path d="M1 12h2" /><path d="M21 12h2" /><path d="M4.22 19.78l1.42-1.42" /><path d="M18.36 5.64l1.42-1.42" />';
    }
}

function initTheme() {
    const saved = getStorage('theme', null);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
}

/* ----------------------------------------------------------------------
 * Appearance management
 * These helper functions allow the user to personalise the accent colour
 * and avatar letter.  Accent gradients are calculated by mixing the
 * chosen colour with white at different ratios and stored as CSS
 * variables.  Avatar letters are saved to localStorage and
 * propagated across all pages.  These functions are called on
 * settings page interactions and during initialisation.
 */

// Convert a hex colour string to an RGB object { r, g, b }
function hexToRgb(hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) {
        h = h.split('').map(c => c + c).join('');
    }
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
}

// Mix a hex colour with white by a given ratio (0 to 1)
function mixWithWhite(hex, ratio) {
    const { r, g, b } = hexToRgb(hex);
    const mix = (c) => Math.round(c * (1 - ratio) + 255 * ratio);
    const rr = mix(r).toString(16).padStart(2, '0');
    const gg = mix(g).toString(16).padStart(2, '0');
    const bb = mix(b).toString(16).padStart(2, '0');
    return `#${rr}${gg}${bb}`;
}

// Apply the chosen accent colour by updating CSS variables and saving
function applyAccentColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', color);
    // Compute lighter tints
    root.style.setProperty('--gradient-1', mixWithWhite(color, 0.3));
    root.style.setProperty('--gradient-2', mixWithWhite(color, 0.5));
    root.style.setProperty('--gradient-3', mixWithWhite(color, 0.7));
    root.style.setProperty('--gradient-4', mixWithWhite(color, 0.85));
    // Persist
    setStorage('accentColor', color);
}

// Update avatar letter globally
function applyAvatarLetter(letter) {
    setStorage('avatarLetter', letter);
    document.querySelectorAll('.avatar').forEach(el => {
        el.textContent = letter || 'K';
    });
}

// Initialise appearance settings on page load
function initAppearance() {
    // Accent colour
    const storedColor = getStorage('accentColor', null);
    if (storedColor) {
        applyAccentColor(storedColor);
    } else {
        // Apply default defined in CSS variables
        const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        applyAccentColor(defaultColor);
    }
    // Avatar letter
    const storedLetter = getStorage('avatarLetter', null);
    if (storedLetter) {
        applyAvatarLetter(storedLetter);
    }
}

// Navigation highlight based on current URL
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const path = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.endsWith(path)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    // Attach theme toggle handler
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function (e) {
            e.preventDefault();
            toggleTheme();
        });
    }
}

// Page-specific initializers will register themselves here
const pageInitializers = {};

/* ----------------------------------------------------------------------
 * Notes page initializer
 * Allows adding, listing and deleting notes.  Notes are stored in
 * localStorage under the key 'notes'.  Each note has a title and
 * content.  Notes are displayed using the .glass-card and .note-card
 * styles for consistency with the rest of the UI.
 */
pageInitializers['notes'] = function () {
    const container = document.getElementById('notes-container');
    const addBtn = document.getElementById('add-note');
    let notes = getStorage('notes', []);
    function save() {
        setStorage('notes', notes);
    }
    function render() {
        container.innerHTML = '';
        if (notes.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = 'No notes yet. Use the Add Note button to create one.';
            container.appendChild(empty);
            return;
        }
        notes.forEach((note, idx) => {
            const card = document.createElement('div');
            card.className = 'glass-card note-card';
            const titleEl = document.createElement('h4');
            titleEl.textContent = note.title || 'Untitled';
            card.appendChild(titleEl);
            const bodyEl = document.createElement('p');
            bodyEl.textContent = note.content || '';
            card.appendChild(bodyEl);
            const actions = document.createElement('div');
            actions.style.marginTop = '0.5rem';
            // Delete button
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Delete';
            delBtn.className = 'primary';
            delBtn.style.marginRight = '0.5rem';
            delBtn.addEventListener('click', () => {
                notes.splice(idx, 1);
                save();
                render();
                // Update home summary if exists
                updateNotesSummary();
            });
            actions.appendChild(delBtn);
            // Edit button
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'primary';
            editBtn.addEventListener('click', () => {
                const newTitle = prompt('Edit title:', note.title);
                if (newTitle !== null) {
                    note.title = newTitle.trim();
                }
                const newContent = prompt('Edit content:', note.content);
                if (newContent !== null) {
                    note.content = newContent;
                }
                save();
                render();
                updateNotesSummary();
            });
            actions.appendChild(editBtn);
            card.appendChild(actions);
            container.appendChild(card);
        });
    }
    addBtn.addEventListener('click', () => {
        const title = prompt('Note title:');
        if (title === null) return;
        const content = prompt('Note content:');
        if (content === null) return;
        notes.push({ title: title.trim(), content: content });
        save();
        render();
        updateNotesSummary();
    });
    render();
};

/* ----------------------------------------------------------------------
 * Settings page initializer
 * Provides controls for changing the accent colour, avatar letter,
 * toggling the theme, exporting/importing data and clearing
 * localStorage.  Utilises helper functions defined above.
 */
pageInitializers['settings'] = function () {
    // Accent colour picker
    const accentInput = document.getElementById('accent-input');
    if (accentInput) {
        // Set input value to current accent
        const current = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
        accentInput.value = current.startsWith('#') ? current : '#f2795c';
        accentInput.addEventListener('input', (e) => {
            const value = e.target.value;
            applyAccentColor(value);
        });
    }
    // Avatar letter input
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        const storedLetter = getStorage('avatarLetter', 'K');
        avatarInput.value = storedLetter;
        avatarInput.addEventListener('input', (e) => {
            const val = e.target.value.toUpperCase().slice(0, 1);
            e.target.value = val;
            applyAvatarLetter(val);
        });
    }
    // Theme toggle button on settings page
    const toggleBtn = document.getElementById('theme-toggle-settings');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleTheme();
        });
    }
    // Export data button
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {
                notes: getStorage('notes', []),
                projects: getStorage('projects', []),
                finances: getStorage('finances', []),
                timetableEvents: getStorage('timetableEvents', {}),
                calendarEvents: getStorage('calendarEvents', {}),
                accentColor: getStorage('accentColor', getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim()),
                avatarLetter: getStorage('avatarLetter', 'K'),
                theme: getStorage('theme', document.documentElement.getAttribute('data-theme'))
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'second_brain_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    // Import data button
    const importBtn = document.getElementById('import-data');
    const fileInput = document.getElementById('import-file');
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.notes) setStorage('notes', data.notes);
                    if (data.projects) setStorage('projects', data.projects);
                    if (data.finances) setStorage('finances', data.finances);
                    if (data.timetableEvents) setStorage('timetableEvents', data.timetableEvents);
                    if (data.calendarEvents) setStorage('calendarEvents', data.calendarEvents);
                    if (data.accentColor) setStorage('accentColor', data.accentColor);
                    if (data.avatarLetter) setStorage('avatarLetter', data.avatarLetter);
                    if (data.theme) setStorage('theme', data.theme);
                    // Apply loaded appearance settings
                    applyAccentColor(data.accentColor || getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim());
                    applyAvatarLetter(data.avatarLetter || 'K');
                    applyTheme(data.theme || document.documentElement.getAttribute('data-theme'));
                    alert('Data imported successfully.  The page will reload to apply changes.');
                    setTimeout(() => location.reload(), 100);
                } catch (ex) {
                    alert('Error importing data: invalid file');
                }
            };
            reader.readAsText(file);
        });
    }
    // Clear data button
    const clearBtn = document.getElementById('clear-data');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('This will erase all your data (notes, projects, finances, timetable, calendar). Continue?')) {
                localStorage.clear();
                // Reload page after clearing
                location.reload();
            }
        });
    }
};

/* Helper to update notes count on the home page.
 * This function is called when notes are added or removed to keep
 * the summary card in sync.  It checks for the presence of the
 * #notes-summary element and updates its text content.
 */
function updateNotesSummary() {
    const summaryEl = document.getElementById('notes-summary');
    if (!summaryEl) return;
    const notes = getStorage('notes', []);
    const count = notes.length;
    summaryEl.textContent = count > 0 ? `${count} note${count === 1 ? '' : 's'}` : 'No notes';
}

// When DOM loaded, call global initializers and specific page init
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    // Apply saved accent colour and avatar before rendering pages
    initAppearance();
    initNavigation();
    const page = document.body.dataset.page;
    if (page && pageInitializers[page]) {
        pageInitializers[page]();
    }
});

/*
 * Timetable page initializer.
 * Generates a two-week schedule grid starting from today.
 */
pageInitializers['timetable'] = function () {
    const container = document.getElementById('timetable-container');
    if (!container) return;
    const events = getStorage('timetableEvents', {});
    // Helper: format date to YYYY-MM-DD
    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    // Generate two-week days starting today
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = formatDate(d);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'timetable-day';
        const header = document.createElement('header');
        header.textContent = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        dayDiv.appendChild(header);
        const list = document.createElement('ul');
        list.className = 'day-list';
        (events[key] || []).forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'task-item' + (item.done ? ' completed' : '');
            // Text span for toggling completion
            const textSpan = document.createElement('span');
            textSpan.textContent = item.title;
            textSpan.style.flex = '1';
            textSpan.addEventListener('click', () => {
                item.done = !item.done;
                setStorage('timetableEvents', events);
                li.classList.toggle('completed');
            });
            li.appendChild(textSpan);
            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-icon';
            delBtn.textContent = '×';
            delBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                // Remove this task from the array
                (events[key] || []).splice(index, 1);
                setStorage('timetableEvents', events);
                // Re-render day
                renderDay(key, list);
            });
            li.appendChild(delBtn);
            list.appendChild(li);
        });
        dayDiv.appendChild(list);
        const addBtn = document.createElement('div');
        addBtn.className = 'add-item';
        addBtn.innerHTML = '+';
        addBtn.addEventListener('click', () => {
            const title = prompt('Add a timetable entry for ' + d.toDateString() + ':');
            if (title) {
                if (!events[key]) events[key] = [];
                events[key].push({ title: title, done: false });
                setStorage('timetableEvents', events);
                // Re-render just this day
                renderDay(key, list);
            }
        });
        dayDiv.appendChild(addBtn);
        container.appendChild(dayDiv);
    }
    // Helper to re-render a single day list after changes
    function renderDay(dayKey, listEl) {
        listEl.innerHTML = '';
        (events[dayKey] || []).forEach((itm, idx) => {
            const li = document.createElement('li');
            li.className = 'task-item' + (itm.done ? ' completed' : '');
            const tSpan = document.createElement('span');
            tSpan.textContent = itm.title;
            tSpan.style.flex = '1';
            tSpan.addEventListener('click', () => {
                itm.done = !itm.done;
                setStorage('timetableEvents', events);
                li.classList.toggle('completed');
            });
            li.appendChild(tSpan);
            const dBtn = document.createElement('button');
            dBtn.className = 'delete-icon';
            dBtn.textContent = '×';
            dBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                (events[dayKey] || []).splice(idx, 1);
                setStorage('timetableEvents', events);
                renderDay(dayKey, listEl);
            });
            li.appendChild(dBtn);
            listEl.appendChild(li);
        });
    }
};

/*
 * Calendar page initializer.
 * Generates a monthly calendar with navigation.
 */
pageInitializers['calendar'] = function () {
    const monthNameEl = document.getElementById('month-name');
    const calendarEl = document.getElementById('calendar-grid');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const events = getStorage('calendarEvents', {});
    let currentDate = new Date();
    currentDate.setDate(1);
    function render() {
        calendarEl.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthNameEl.textContent = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        const firstDayIndex = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Fill blanks before first day
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day';
            calendarEl.appendChild(emptyCell);
        }
        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            const num = document.createElement('div');
            num.className = 'day-number';
            num.textContent = day;
            cell.appendChild(num);
            const evContainer = document.createElement('div');
            evContainer.className = 'events';
            (events[dateStr] || []).forEach((ev, idx) => {
                const evEl = document.createElement('div');
                evEl.className = 'calendar-event';
                evEl.textContent = '• ' + ev.title;
                // Allow deleting an event by clicking on it
                evEl.addEventListener('click', (evClick) => {
                    evClick.stopPropagation();
                    if (confirm('Delete event "' + ev.title + '"?')) {
                        (events[dateStr] || []).splice(idx, 1);
                        setStorage('calendarEvents', events);
                        render();
                    }
                });
                evContainer.appendChild(evEl);
            });
            cell.appendChild(evContainer);
            cell.addEventListener('click', () => {
                const title = prompt('Add an event on ' + dateStr + ':');
                if (title) {
                    if (!events[dateStr]) events[dateStr] = [];
                    events[dateStr].push({ title: title });
                    setStorage('calendarEvents', events);
                    render();
                }
            });
            calendarEl.appendChild(cell);
        }
    }
    render();
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        render();
    });
    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        render();
    });
};

/*
 * Projects page initializer.
 * Allows adding projects and tasks with status.
 */
pageInitializers['projects'] = function () {
    const container = document.getElementById('projects-container');
    const addProjectBtn = document.getElementById('add-project');
    let projects = getStorage('projects', []);
    function save() {
        setStorage('projects', projects);
    }
    function render() {
        container.innerHTML = '';
        projects.forEach((project, idx) => {
            const card = document.createElement('div');
            // Apply glass effect plus a soft pastel background for variety
            card.className = 'glass-card project-card project-color-' + (idx % 5);
            // Progress bar shows percentage of tasks completed
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            const total = project.tasks.length;
            const completedCount = project.tasks.filter(t => t.done).length;
            const percent = total > 0 ? (completedCount / total * 100) : 0;
            progressBar.style.width = percent + '%';
            progressContainer.appendChild(progressBar);
            card.appendChild(progressContainer);
            // Project title and counts
            const header = document.createElement('h3');
            header.textContent = project.name;
            card.appendChild(header);
            // Task list
            const taskList = document.createElement('ul');
            project.tasks.forEach((task, tIdx) => {
                const li = document.createElement('li');
                li.className = 'task-item' + (task.done ? ' completed' : '');
                li.textContent = task.title;
                li.addEventListener('click', () => {
                    task.done = !task.done;
                    save();
                    render();
                });
                taskList.appendChild(li);
            });
            card.appendChild(taskList);
            // Add task button
            const newTaskBtn = document.createElement('button');
            newTaskBtn.textContent = 'Add Task';
            newTaskBtn.className = 'primary';
            newTaskBtn.addEventListener('click', () => {
                const title = prompt('New task for ' + project.name + ':');
                if (title) {
                    project.tasks.push({ title: title, done: false });
                    save();
                    render();
                }
            });
            card.appendChild(newTaskBtn);
            container.appendChild(card);
        });
    }
    render();
    addProjectBtn.addEventListener('click', () => {
        const name = prompt('New project name:');
        if (name) {
            projects.push({ name: name, tasks: [] });
            save();
            render();
        }
    });
};

/*
 * Finances page initializer.
 * Tracks income and expenses and shows a running summary.
 */
pageInitializers['finances'] = function () {
    const form = document.getElementById('finance-form');
    const tbody = document.getElementById('finance-rows');
    // Elements for the finance summary cards and progress bar
    const incomeTotalEl = document.getElementById('income-total');
    const expenseTotalEl = document.getElementById('expense-total');
    const netTotalEl = document.getElementById('net-total');
    const progressBarEl = document.getElementById('finance-progress');
    let finances = getStorage('finances', []);
    function save() {
        setStorage('finances', finances);
    }
    function render() {
        tbody.innerHTML = '';
        let income = 0;
        let expense = 0;
        finances.forEach((item, idx) => {
            if (item.type === 'income') income += parseFloat(item.amount);
            else expense += parseFloat(item.amount);
            const tr = document.createElement('tr');
            const descTd = document.createElement('td');
            descTd.textContent = item.description;
            tr.appendChild(descTd);
            const amtTd = document.createElement('td');
            amtTd.textContent = (item.type === 'income' ? '+' : '-') + parseFloat(item.amount).toFixed(2);
            amtTd.className = item.type === 'income' ? 'income' : 'expense';
            tr.appendChild(amtTd);
            const dateTd = document.createElement('td');
            dateTd.textContent = item.date;
            tr.appendChild(dateTd);
            const deleteTd = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.textContent = '×';
            delBtn.style.width = '1.5rem';
            delBtn.addEventListener('click', () => {
                finances.splice(idx, 1);
                save();
                render();
            });
            deleteTd.appendChild(delBtn);
            tr.appendChild(deleteTd);
            tbody.appendChild(tr);
        });
        // Update summary cards
        const net = income - expense;
        incomeTotalEl.textContent = '£' + income.toFixed(2);
        expenseTotalEl.textContent = '£' + expense.toFixed(2);
        netTotalEl.textContent = '£' + net.toFixed(2);
        // Update progress bar showing expense/income ratio
        let ratio = 0;
        // Use total (income + expense) as denominator to ensure some bar when only expenses
        const total = income + expense;
        if (total > 0) {
            ratio = Math.min(100, (expense / total) * 100);
        }
        progressBarEl.style.width = ratio + '%';
    }
    render();
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const description = form.querySelector('[name="description"]').value.trim();
        const amount = form.querySelector('[name="amount"]').value.trim();
        const type = form.querySelector('[name="type"]').value;
        const date = form.querySelector('[name="date"]').value || new Date().toISOString().split('T')[0];
        if (!description || !amount || isNaN(amount)) {
            alert('Please fill in a valid description and amount');
            return;
        }
        finances.push({ description, amount: parseFloat(amount), type, date });
        form.reset();
        save();
        render();
    });
};

/*
 * Home page initializer.
 * Displays a greeting and summary of upcoming event, pending tasks and net finance.
 */
pageInitializers['home'] = function () {
    const nextEventEl = document.getElementById('next-event');
    const tasksEl = document.getElementById('tasks-summary');
    const financeEl = document.getElementById('finance-summary-home');
    // Next event from calendar
    const events = getStorage('calendarEvents', {});
    const today = new Date().toISOString().split('T')[0];
    let upcoming = null;
    Object.keys(events).forEach(dateStr => {
        if (dateStr >= today) {
            events[dateStr].forEach(ev => {
                const candidate = { date: dateStr, title: ev.title };
                if (!upcoming || candidate.date < upcoming.date) {
                    upcoming = candidate;
                }
            });
        }
    });
    if (upcoming) {
        nextEventEl.textContent = `${upcoming.title} on ${new Date(upcoming.date).toLocaleDateString()}`;
    } else {
        nextEventEl.textContent = 'No upcoming events';
    }
    // Pending tasks from timetable
    const tEvents = getStorage('timetableEvents', {});
    let pending = 0;
    Object.values(tEvents).forEach(list => {
        list.forEach(item => {
            if (!item.done) pending++;
        });
    });
    tasksEl.textContent = pending > 0 ? `${pending} pending ${pending === 1 ? 'task' : 'tasks'}` : 'No pending tasks';
    // Finance summary
    const finances = getStorage('finances', []);
    let income = 0, expense = 0;
    finances.forEach(item => {
        if (item.type === 'income') income += parseFloat(item.amount);
        else expense += parseFloat(item.amount);
    });
    const net = income - expense;
    financeEl.textContent = `Net balance: £${net.toFixed(2)}`;

    // Notes summary
    updateNotesSummary();

    // World clock: update current time and world city times every second.
    const clockEl = document.getElementById('digital-clock');
    const laEl = document.getElementById('time-la');
    const nyEl = document.getElementById('time-ny');
    const londonEl = document.getElementById('time-london');
    const parisEl = document.getElementById('time-paris');
    const kyivEl = document.getElementById('time-kyiv');
    function updateTimes() {
        const now = new Date();
        // Format local time as HH:MM:SS
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        // Helper: update a city element given a time zone
        function setTime(el, tz) {
            if (!el) return;
            el.textContent = new Date().toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit' });
        }
        setTime(laEl, 'America/Los_Angeles');
        setTime(nyEl, 'America/New_York');
        setTime(londonEl, 'Europe/London');
        setTime(parisEl, 'Europe/Paris');
        setTime(kyivEl, 'Europe/Kiev');
    }
    updateTimes();
    setInterval(updateTimes, 1000);
};