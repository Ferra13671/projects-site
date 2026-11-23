const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

const contentArea = document.getElementById('content-area');
const titleElement = document.getElementById('project-title');
const headerBg = document.getElementById('header-bg');
const githubLink = document.getElementById('github-link');
const docsSidebar = document.getElementById('docs-sidebar');
const docsMenu = document.getElementById('docs-menu-container');

let docsStructure = [];
let currentGroup = '';
let currentPage = '';

if (!projectId) {
    contentArea.innerHTML = '<p style="color: red;">Ошибка: Проект не найден в URL.</p>';
} else {
    fetch(`projects/${projectId}/card.json`)
        .then(res => res.json())
        .then(data => {
            titleElement.textContent = data.title;
            document.title = `${data.title} | Документация`;
            headerBg.style.backgroundImage = `url('projects/${projectId}/images/header.png')`;
            if (data.github) githubLink.href = data.github;
            if(typeof applyTranslationsToDOM === 'function') applyTranslationsToDOM();
        })
        .catch(err => console.error(err));

    loadTab('about');
}

function loadTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');

    docsSidebar.classList.remove('visible');
    contentArea.innerHTML = '<p>Загрузка...</p>';

    if (tabName === 'about') {
        fetch(`projects/${projectId}/${currentLang}/about.md`)
            .then(res => res.ok ? res.text() : Promise.reject())
            .then(md => {
                // Пропускаем через парсер
                const parsedMd = parseCustomMarkdown(md);
                contentArea.innerHTML = marked.parse(parsedMd);
                highlightCode();
            })
            .catch(() => contentArea.innerHTML = `<p>Файл about.md не найден.</p>`);
    } else if (tabName === 'docs') {
        docsSidebar.classList.add('visible');
        initDocumentation();
    } else if (tabName === 'changelog') {
        contentArea.innerHTML = '<p>Раздел изменений находится в разработке.</p>';
    }
}

function initDocumentation() {
    fetch(`projects/${projectId}/${currentLang}/documentation/info.json`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
            docsStructure = data;
            renderSidebar();
            if (docsStructure.length > 0 && docsStructure[0].pages.length > 0) {
                loadDocPage(docsStructure[0].id, docsStructure[0].pages[0].id);
            } else {
                contentArea.innerHTML = '<p>Документация пуста.</p>';
            }
        })
        .catch(err => {
            contentArea.innerHTML = '<p>Документация для этого проекта пока не создана.</p>';
            docsMenu.innerHTML = '';
        });
}

function renderSidebar() {
    docsMenu.innerHTML = '';
    docsStructure.forEach(group => {
        const groupTitle = document.createElement('div');
        groupTitle.className = 'docs-group-title';
        groupTitle.textContent = group.title;
        docsMenu.appendChild(groupTitle);

        group.pages.forEach(page => {
            const link = document.createElement('a');
            link.className = 'docs-link';
            link.id = `link-${group.id}-${page.id}`;
            link.textContent = page.title;
            link.onclick = () => loadDocPage(group.id, page.id);
            docsMenu.appendChild(link);
        });
    });
}

function loadDocPage(group, page) {
    currentGroup = group;
    currentPage = page;

    document.querySelectorAll('.docs-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.getElementById(`link-${group}-${page}`);
    if(activeLink) activeLink.classList.add('active');

    contentArea.innerHTML = '<p>Загрузка...</p>';

    const mdPath = `projects/${projectId}/${currentLang}/documentation/${group}/${page}.md`;

    fetch(mdPath)
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(md => {
            // 1. Сначала парсим наши кастомные блоки (:::info, :::tabs)
            const parsedMd = parseCustomMarkdown(md);

            // 2. Затем конвертируем Markdown в HTML
            let html = marked.parse(parsedMd);
            contentArea.innerHTML = html;

            fixImages(group);
            fixInternalLinks();
            highlightCode();
            renderPageNav();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(err => {
            contentArea.innerHTML = `<p style="color: red;">Ошибка: Не удалось загрузить файл <code>${group}/${page}.md</code>.</p>`;
        });
}

// === ПАРСЕР КАСТОМНЫХ БЛОКОВ ===
function parseCustomMarkdown(md) {
    let parsed = md;

    // 1. Парсим Hints (:::info ... :::)
    // Добавлено \r? и \s* для поддержки Windows-переносов и лишних пробелов
    const hintRegex = /:::(info|success|warning|danger)\s*\r?\n([\s\S]*?)\r?\n\s*:::/g;
    parsed = parsed.replace(hintRegex, (match, type, content) => {
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warning') icon = '⚠️';
        if (type === 'danger') icon = '🚫';

        // Важно: \n\n до и после div нужны, чтобы marked.js правильно распарсил HTML
        return `\n\n<div class="hint hint-${type}"><div class="hint-icon">${icon}</div><div class="hint-content">\n\n${content.trim()}\n\n</div></div>\n\n`;
    });

    // 2. Парсим Tabs (:::tabs ... :::)
    let tabGroupCounter = 0;
    const tabsRegex = /:::tabs\s*\r?\n([\s\S]*?)\r?\n\s*:::/g;
    parsed = parsed.replace(tabsRegex, (match, content) => {
        tabGroupCounter++;
        const groupId = `tabgroup-${Date.now()}-${tabGroupCounter}`;

        // Разделяем контент по @tab (учитывая возможные пробелы)
        const tabBlocks = content.split(/@tab\s+/).filter(b => b.trim() !== '');

        let navHtml = '<div class="tabs-nav">';
        let contentHtml = '';

        tabBlocks.forEach((block, index) => {
            // Очищаем от \r, чтобы не было лишних переносов
            let lines = block.replace(/\r/g, '').trim().split('\n');
            let title = lines.shift().trim();
            let tabContent = lines.join('\n').trim();
            let tabId = `${groupId}-${index}`;
            let activeClass = index === 0 ? 'active' : '';

            navHtml += `<button class="tab-btn ${activeClass}" onclick="switchTab(event, '${tabId}')">${title}</button>`;
            contentHtml += `<div id="${tabId}" class="tab-content ${activeClass}">\n\n${tabContent}\n\n</div>`;
        });

        navHtml += '</div>';

        return `\n\n<div class="tabs-container">${navHtml}${contentHtml}</div>\n\n`;
    });

    return parsed;
}

function fixImages(group) {
    const images = contentArea.querySelectorAll('img');
    images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http') && !src.startsWith('/')) {
            img.src = `projects/${projectId}/${currentLang}/documentation/${src}`;
        }
    });
}

function fixInternalLinks() {
    const links = contentArea.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            link.onclick = (e) => {
                e.preventDefault();
                const parts = href.substring(1).split('/');
                if (parts.length === 2) loadDocPage(parts[0], parts[1]);
            };
        }
    });
}

function highlightCode() {
    if (window.Prism) Prism.highlightAllUnder(contentArea);
}

function renderPageNav() {
    const oldNav = contentArea.querySelector('.page-nav');
    if (oldNav) oldNav.remove();

    let prevPage = null;
    let nextPage = null;
    let flatPages = [];

    docsStructure.forEach(group => {
        group.pages.forEach(page => {
            flatPages.push({ groupId: group.id, pageId: page.id, title: page.title });
        });
    });

    const currentIndex = flatPages.findIndex(p => p.groupId === currentGroup && p.pageId === currentPage);

    if (currentIndex > 0) prevPage = flatPages[currentIndex - 1];
    if (currentIndex < flatPages.length - 1) nextPage = flatPages[currentIndex + 1];
    if (!prevPage && !nextPage) return;

    const navContainer = document.createElement('div');
    navContainer.className = 'page-nav';

    if (prevPage) {
        const prevLink = document.createElement('a');
        prevLink.href = "#";
        prevLink.className = "prev";
        prevLink.innerHTML = `<span class="nav-label">← Previous</span><span class="nav-title">${prevPage.title}</span>`;
        prevLink.onclick = (e) => { e.preventDefault(); loadDocPage(prevPage.groupId, prevPage.pageId); };
        navContainer.appendChild(prevLink);
    } else {
        navContainer.appendChild(document.createElement('div'));
    }

    if (nextPage) {
        const nextLink = document.createElement('a');
        nextLink.href = "#";
        nextLink.className = "next";
        nextLink.innerHTML = `<span class="nav-label">Next →</span><span class="nav-title">${nextPage.title}</span>`;
        nextLink.onclick = (e) => { e.preventDefault(); loadDocPage(nextPage.groupId, nextPage.pageId); };
        navContainer.appendChild(nextLink);
    }

    contentArea.appendChild(navContainer);
}

window.switchTab = function(evt, tabId) {
    const container = evt.currentTarget.closest('.tabs-container');
    container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');

    if(window.Prism) Prism.highlightAllUnder(document.getElementById(tabId));
};