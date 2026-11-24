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
let isDocStructureLoaded = false; // Флаг, чтобы не грузить info.json дважды

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
}

// === РОУТЕР (Обработка URL) ===
function handleRouting() {
    const hash = window.location.hash.substring(1); // Убираем символ #

    // Если хэша нет, открываем "О проекте"
    if (!hash || hash === 'about') {
        loadTab('about', false); // false = не менять URL
    }
    // Если вкладка Изменения
    else if (hash === 'changelog') {
        loadTab('changelog', false);
    }
    // Если документация (может быть просто #docs или #docs/group/page)
    else if (hash.startsWith('docs')) {
        const parts = hash.split('/');
        if (parts.length === 3) {
            // Формат: docs/group/page
            loadTab('docs', false, parts[1], parts[2]);
        } else {
            // Просто #docs (откроет первую страницу)
            loadTab('docs', false);
        }
    }
    // Если что-то непонятное, кидаем на главную
    else {
        loadTab('about', false);
    }
}

// === ВКЛАДКИ ===
function loadTab(tabName, updateHash = true, targetGroup = null, targetPage = null) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');

    docsSidebar.classList.remove('visible');
    contentArea.innerHTML = '<p>Загрузка...</p>';

    // Обновляем URL, если это не вызвано роутером
    if (updateHash) {
        window.location.hash = tabName;
    }

    if (tabName === 'about') {
        fetch(`projects/${projectId}/${currentLang}/about.md`)
            .then(res => res.ok ? res.text() : Promise.reject())
            .then(md => {
                const parsedMd = parseCustomMarkdown(md);
                contentArea.innerHTML = marked.parse(parsedMd);
                highlightCode();
            })
            .catch(() => contentArea.innerHTML = `<p>Файл about.md не найден.</p>`);
    } else if (tabName === 'docs') {
        docsSidebar.classList.add('visible');
        initDocumentation(targetGroup, targetPage);
    } else if (tabName === 'changelog') {
        contentArea.innerHTML = '<p>Раздел изменений находится в разработке.</p>';
    }
}

// === ДОКУМЕНТАЦИЯ ===
function initDocumentation(targetGroup = null, targetPage = null) {
    // Если структура уже загружена (например, мы просто кликаем по ссылкам в сайдбаре),
    // не делаем повторный fetch
    if (isDocStructureLoaded) {
        if (targetGroup && targetPage) {
            loadDocPage(targetGroup, targetPage, false);
        } else if (docsStructure.length > 0 && docsStructure[0].pages.length > 0) {
            // Если перешли на вкладку "Документация" без указания страницы, грузим первую
            loadDocPage(docsStructure[0].id, docsStructure[0].pages[0].id, true);
        }
        return;
    }

    fetch(`projects/${projectId}/${currentLang}/documentation/info.json`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
            docsStructure = data;
            isDocStructureLoaded = true;
            renderSidebar();

            if (targetGroup && targetPage) {
                loadDocPage(targetGroup, targetPage, false);
            } else if (docsStructure.length > 0 && docsStructure[0].pages.length > 0) {
                // Если в URL был просто #docs, грузим первую страницу
                loadDocPage(docsStructure[0].id, docsStructure[0].pages[0].id, true);
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
            // При клике в сайдбаре передаем updateHash = true
            link.onclick = () => loadDocPage(group.id, page.id, true);
            docsMenu.appendChild(link);
        });
    });
}

function loadDocPage(group, page, updateHash = true) {
    currentGroup = group;
    currentPage = page;

    // Подсветка в меню
    document.querySelectorAll('.docs-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.getElementById(`link-${group}-${page}`);
    if(activeLink) activeLink.classList.add('active');

    // Обновляем URL (формат #docs/group/page)
    if (updateHash) {
        window.location.hash = `docs/${group}/${page}`;
    }

    contentArea.innerHTML = '<p>Загрузка...</p>';

    const mdPath = `projects/${projectId}/${currentLang}/documentation/${group}/${page}.md`;

    fetch(mdPath)
        .then(res => res.ok ? res.text() : Promise.reject())
        .then(md => {
            const parsedMd = parseCustomMarkdown(md);
            contentArea.innerHTML = marked.parse(parsedMd);

            fixImages(group);
            fixInternalLinks();
            highlightCode();
            renderPageNav();

            // Плавно прокручиваем наверх при смене страницы
            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(err => {
            contentArea.innerHTML = `<p style="color: red;">Ошибка: Не удалось загрузить файл <code>${group}/${page}.md</code>.</p>`;
        });
}

// === ПАРСЕР И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function parseCustomMarkdown(md) {
    let parsed = md;
    const hintRegex = /:::(info|success|warning|danger)\s*\r?\n([\s\S]*?)\r?\n\s*:::/g;
    parsed = parsed.replace(hintRegex, (match, type, content) => {
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'warning') icon = '⚠️';
        if (type === 'danger') icon = '🚫';
        return `\n\n<div class="hint hint-${type}"><div class="hint-icon">${icon}</div><div class="hint-content">\n\n${content.trim()}\n\n</div></div>\n\n`;
    });

    let tabGroupCounter = 0;
    const tabsRegex = /:::tabs\s*\r?\n([\s\S]*?)\r?\n\s*:::/g;
    parsed = parsed.replace(tabsRegex, (match, content) => {
        tabGroupCounter++;
        const groupId = `tabgroup-${Date.now()}-${tabGroupCounter}`;
        const tabBlocks = content.split(/@tab\s+/).filter(b => b.trim() !== '');
        let navHtml = '<div class="tabs-nav">';
        let contentHtml = '';

        tabBlocks.forEach((block, index) => {
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
            // Если это внутренняя ссылка вида #group/page
            if (href.split('/').length === 2) {
                link.onclick = (e) => {
                    e.preventDefault();
                    const parts = href.substring(1).split('/');
                    loadDocPage(parts[0], parts[1], true); // true = обновить URL
                };
            }
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
        prevLink.onclick = (e) => { e.preventDefault(); loadDocPage(prevPage.groupId, prevPage.pageId, true); };
        navContainer.appendChild(prevLink);
    } else {
        navContainer.appendChild(document.createElement('div'));
    }

    if (nextPage) {
        const nextLink = document.createElement('a');
        nextLink.href = "#";
        nextLink.className = "next";
        nextLink.innerHTML = `<span class="nav-label">Next →</span><span class="nav-title">${nextPage.title}</span>`;
        nextLink.onclick = (e) => { e.preventDefault(); loadDocPage(nextPage.groupId, nextPage.pageId, true); };
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