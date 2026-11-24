document.addEventListener('DOMContentLoaded', () => {
    // Меняем путь на .json5
    fetch('projects/info.json5')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось загрузить info.json5');
            return response.text(); // Получаем текст
        })
        .then(text => JSON5.parse(text)) // Парсим JSON5
        .then(projectIds => {
            const fetchPromises = projectIds.map(id => {
                // Меняем путь на .json5
                return fetch(`projects/${id}/card.json5`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Не удалось загрузить card.json5 для ${id}`);
                        return res.text();
                    })
                    .then(text => JSON5.parse(text))
                    .then(data => {
                        return { ...data, id: id };
                    });
            });
            return Promise.all(fetchPromises);
        })
        .then(projects => {
            const container = document.querySelector('.projects-grid');
            if (!container) return;

            container.innerHTML = '';

            projects.forEach(project => {
                const card = document.createElement('a');
                card.href = `project.html?id=${project.id}&lang=${currentLang}`;
                card.className = 'project-card';

                const coverImage = `projects/${project.id}/images/cover.png`;

                card.innerHTML = `
                    <img src="${coverImage}" alt="${project.title}" class="card-image" onerror="this.src='https://placehold.co/600x400/252525/ffffff?text=No+Image'">
                    <div class="card-content">
                        <h3 class="card-title">${project.title}</h3>
                        <div class="card-hover-content">
                            <p class="card-description">${project.description}</p>
                            <div class="card-hint" data-i18n="click_to_view">Click to view project →</div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
                if(typeof applyTranslationsToDOM === 'function') applyTranslationsToDOM();
            });
        })
        .catch(error => {
            console.error('Ошибка при рендеринге проектов:', error);
            const container = document.querySelector('.projects-grid');
            if (container) {
                container.innerHTML = `<p style="color: red;">Ошибка загрузки проектов. Проверьте консоль (F12).</p>`;
            }
        });
});