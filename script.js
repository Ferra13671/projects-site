document.addEventListener('DOMContentLoaded', () => {
    fetch('projects.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Не удалось загрузить projects.json');
            }
            return response.json();
        })
        .then(projects => {
            const container = document.querySelector('.projects-grid');
            if (!container) return;

            // Очищаем контейнер перед рендером
            container.innerHTML = '';

            projects.forEach(project => {
                const card = document.createElement('a');
                card.href = project.link;
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
        });
});