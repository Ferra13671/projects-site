const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

const contentArea = document.getElementById('content-area');
const titleElement = document.getElementById('project-title');
const headerBg = document.getElementById('header-bg');
const githubLink = document.getElementById('github-link');
const docsSidebar = document.getElementById('docs-sidebar');
const docsMenu = document.getElementById('docs-menu-container');

// Переменная для хранения текущей структуры документации
let docsStructure = {};
let currentGroup = '';
let currentPage = '';

if (!projectId) {
    contentArea.innerHTML = '<p style="color: red;">Ошибка: Проект не найден в URL.</p>';
} else {
    // Загружаем карточку проекта
    fetch(`projects/${projectId}/card.json`)
        .then(res => res.json())
        .then(data => {
            titleElement.textContent = data.title;
            document.title = `${data.title} | Документация`;
            headerBg.style.backgroundImage = `url('projects/${projectId}/images/header.png')`;
            if (data.github) githubLink.href = data.github;
        })
        .catch(err => console.error(err));

    // По умолчанию открываем "О проекте"
    loadTab('about');
}

// Функция переключения главных вкладок
function loadTab(tabName) {
    // Подсветка кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Скрываем сайдбар по умолчанию
    docsSidebar.classList.remove('visible');
    contentArea.innerHTML = '<p>Загрузка...</p>';

    if (tabName === 'about') {
        fetch(`projects/${projectId}/about.md`)
            .then(res => res.ok ? res.text() : Promise.reject())
            .then(md => contentArea.innerHTML = marked.parse(md))
            .catch(() => contentArea.innerHTML = '<p>Файл about.md не найден.</p>');

    } else if (tabName === 'docs') {
        docsSidebar.classList.add('visible');
        initDocumentation();

    } else if (tabName === 'changelog') {
        contentArea.innerHTML = '<p>Раздел изменений находится в разработке.</p>';
    }
}

// Инициализация документации
function initDocumentation() {
    fetch(`projects/${projectId}/documentation/info.json`)
        .then(res => {
            if(!res.ok) throw new Error("Нет info.json");
            return res.json();
        })
        .then(data => {
            docsStructure = data;
            renderSidebar();

            // Загружаем первую страницу, если не указана в URL
            const firstGroup = Object.keys(docsStructure)[0];
            if (firstGroup) {
                const firstPage = docsStructure[firstGroup][0];
                loadDocPage(firstGroup, firstPage);
            } else {
                contentArea.innerHTML = '<p>Документация пуста.</p>';
            }
        })
        .catch(err => {
            contentArea.innerHTML = '<p>Документация для этого проекта пока не создана.</p>';
            docsMenu.innerHTML = '';
        });
}

// Рендер бокового меню
function renderSidebar() {
    docsMenu.innerHTML = '';

    for (const group in docsStructure) {
        // Заголовок группы
        const groupTitle = document.createElement('div');
        groupTitle.className = 'docs-group-title';
        groupTitle.textContent = group.replace(/-/g, ' '); // Меняем дефисы на пробелы
        docsMenu.appendChild(groupTitle);

        // Страницы группы
        docsStructure[group].forEach(page => {
            const link = document.createElement('a');
            link.className = 'docs-link';
            link.id = `link-${group}-${page}`;
            link.textContent = page.replace(/-/g, ' '); // Красивое отображение

            link.onclick = () => loadDocPage(group, page);
            docsMenu.appendChild(link);
        });
    }
}

// Загрузка конкретной страницы документации
function loadDocPage(group, page) {
    currentGroup = group;
    currentPage = page;

    // Подсветка активной ссылки
    document.querySelectorAll('.docs-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.getElementById(`link-${group}-${page}`);
    if(activeLink) activeLink.classList.add('active');

    contentArea.innerHTML = '<p>Загрузка...</p>';

    const mdPath = `projects/${projectId}/documentation/${group}/${page}.md`;

    fetch(mdPath)
        .then(res => {
            if (!res.ok) throw new Error('Страница не найдена');
            return res.text();
        })
        .then(md => {
            // Парсим Markdown
            let html = marked.parse(md);

            // Вставляем в DOM
            contentArea.innerHTML = html;

            // Пост-обработка: исправляем картинки и ссылки
            fixImages(group);
            fixInternalLinks();
        })
        .catch(err => {
            contentArea.innerHTML = `<p style="color: red;">Ошибка: Не удалось загрузить файл <code>${group}/${page}.md</code>.</p>`;
        });
}

// Исправление путей к картинкам (чтобы они грузились из папки документации)
function fixImages(group) {
    const images = contentArea.querySelectorAll('img');
    images.forEach(img => {
        const src = img.getAttribute('src');
        // Если путь относительный (не начинается с http и не абсолютный),
        // добавляем путь до папки с документацией
        if (src && !src.startsWith('http') && !src.startsWith('/')) {
            // Ищем картинку сначала в папке группы, потом в общей папке documentation
            // Для простоты будем считать, что они лежат в projects/<id>/documentation/images/
            img.src = `projects/${projectId}/documentation/${src}`;
        }
    });
}

// Перехват кликов по ссылкам внутри Markdown (формат #group/page)
function fixInternalLinks() {
    const links = contentArea.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            link.onclick = (e) => {
                e.preventDefault();
                const parts = href.substring(1).split('/'); // убираем # и делим
                if (parts.length === 2) {
                    loadDocPage(parts[0], parts[1]);
                }
            };
        }
    });
}