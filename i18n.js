// Определяем язык: сначала из URL (?lang=ru), потом из LocalStorage, иначе 'en'
const urlLang = new URLSearchParams(window.location.search).get('lang');
const currentLang = urlLang || localStorage.getItem('site_lang') || 'en';

// Сохраняем выбор в LocalStorage
localStorage.setItem('site_lang', currentLang);

let translations = {};

// Функция для получения перевода по ключу
function t(key) {
    return translations[key] || key;
}

// Асинхронная загрузка словаря перед запуском основного скрипта
async function loadTranslations() {
    try {
        const response = await fetch(`locales/${currentLang}.json`);
        translations = await response.json();
        applyTranslationsToDOM();
    } catch (e) {
        console.error("Ошибка загрузки переводов:", e);
    }
}

// Функция, которая ищет элементы с атрибутом data-i18n и меняет им текст
function applyTranslationsToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (el.tagName === 'INPUT' && el.type === 'placeholder') {
            el.placeholder = t(key);
        } else {
            el.textContent = t(key);
        }
    });

    // Обновляем селектор языка
    const langSelect = document.getElementById('lang-switch');
    if (langSelect) langSelect.value = currentLang;
}

// Функция смены языка (перезагружает страницу с новым параметром)
function changeLanguage(lang) {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.location.href = url.toString();
}

// Запускаем загрузку переводов
loadTranslations();