const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('id');

const contentArea = document.getElementById('content-area');
const titleElement = document.getElementById('project-title');
const headerBg = document.getElementById('header-bg');
const githubLink = document.getElementById('github-link');

if (!projectId) {
    contentArea.innerHTML = '<p style="color: red;">Ошибка: Проект не найден в URL. Вернитесь на <a href="index.html">главную</a>.</p>';
} else {
    fetch(`projects/${projectId}/card.json`)
        .then(res => res.json())
        .then(data => {
            titleElement.textContent = data.title;
            document.title = `${data.title} | Документация`;

            // 1. Устанавливаем фоновое изображение header.png
            headerBg.style.backgroundImage = `url('projects/${projectId}/images/header.png')`;

            // 2. Настраиваем ссылку на Github
            if (data.github) {
                githubLink.href = data.github;
            } else {
                // Если ссылки нет в JSON, ведем на общий профиль или скрываем
                githubLink.href = "https://github.com/Ferra13671";
            }
        })
        .catch(err => {
            console.error("Ошибка загрузки card.json", err);
            contentArea.innerHTML = '<p style="color: red;">Не удалось загрузить данные проекта.</p>';
        });

    // По умолчанию открываем вкладку "О проекте"
    loadTab('about');
}

function loadTab(tabName, btnElement = null) {
    if (btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }

    contentArea.innerHTML = '<p>Загрузка...</p>';

    if (tabName === 'about') {
        fetch(`projects/${projectId}/about.md`)
            .then(res => {
                if (!res.ok) throw new Error('Файл about.md не найден');
                return res.text();
            })
            .then(markdown => {
                contentArea.innerHTML = marked.parse(markdown);
            })
            .catch(err => {
                contentArea.innerHTML = `<p style="color: var(--text-muted);">Файл <code>about.md</code> для этого проекта пока не создан.</p>`;
            });
    } else if (tabName === 'docs') {
        contentArea.innerHTML = '<p>Раздел документации находится в разработке.</p>';
    } else if (tabName === 'changelog') {
        contentArea.innerHTML = '<p>Раздел изменений находится в разработке.</p>';
    }
}