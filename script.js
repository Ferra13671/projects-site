document.addEventListener('DOMContentLoaded', () => {
    fetch('projects/info.json')
        .then(response => {
            if (!response.ok) throw new Error('Не удалось загрузить info.json');
            return response.json();
        })
        .then(projectIds => {
            const fetchPromises = projectIds.map(id => {
                return fetch(`projects/${id}/card.json`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Не удалось загрузить card.json для ${id}`);
                        return res.json();
                    })
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

                // Теперь ссылка ведет на страницу project.html с параметром id
                card.href = `project.html?id=${project.id}`;
                card.className = 'project-card';

                // Автоматически формируем путь к обложке
                const coverImage = `projects/${project.id}/images/cover.png`;

                card.innerHTML = `
                    <img src="${coverImage}" alt="${project.title}" class="card-image" onerror="this.src='https://placehold.co/600x400/252525/ffffff?text=No+Image'">
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
            const container = document.querySelector('.projects-grid');
            if (container) {
                container.innerHTML = `<p style="color: red;">Ошибка загрузки проектов. Проверьте консоль (F12).</p>`;
            }
        });
});