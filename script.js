document.addEventListener('DOMContentLoaded', () => {
    // 1. Сначала получаем список проектов из info.json
    fetch('projects/info.json')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось загрузить info.json');
            return response.json();
        })
        .then(projectIds => {
            // 2. Для каждого ID из списка делаем запрос к его card.json
            const fetchPromises = projectIds.map(id => {
                return fetch(`projects/${id}/card.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Не удалось загрузить card.json для ${id}`);
                        return res.json();
                    })
                    .then(data => {
                        // Добавляем ID проекта в данные, чтобы использовать его для ссылки
                        return { ...data, id: id };
                    });
            });

            // 3. Ждем, пока загрузятся все карточки (Promise.all)
            return Promise.all(fetchPromises);
        })
        .then(projects => {
            const container = document.querySelector('.projects-grid');
            if (!container) return;

            // Очищаем контейнер
            container.innerHTML = '';

            // 4. Рендерим карточки
            projects.forEach(project => {
                const card = document.createElement('a');

                // Ссылка автоматически ведет в папку проекта (например, projects/comet-renderer/)
                card.href = `projects/${project.id}/`;
                card.className = 'project-card';

                card.innerHTML = `
                    <img src="${project.image}" alt="${project.title}" class="card-image">
                    <div class="card-content">
                        <h3 class="card-title">${project.title}</h3>
                        <div class="card-hover-content">
                            <p class="card-description">${project.description}</p>
                            <div class="card-hint">Click to view project →</div>
                        </div>
                    </div>
                `;

                container.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Ошибка при рендеринге проектов:', error);
            // Если что-то пошло не так, выводим сообщение в контейнер
            const container = document.querySelector('.projects-grid');
            if (container) {
                container.innerHTML = `<p style="color: red;">Ошибка загрузки проектов. Проверьте консоль (F12).</p>`;
            }
        });
});