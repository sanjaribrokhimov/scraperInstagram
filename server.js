import express from 'express';
import cors from 'cors';
import { ApifyClient } from 'apify-client';

const app = express();
const port = 3000;

// Инициализация клиента Apify с вашим токеном
const client = new ApifyClient({
    token: '', // Замените на свой токен
});

// Использование cors middleware
app.use(cors());

// Эндпоинт для получения информации о профиле и видео
app.get('/api/profile', async (req, res) => {
    const username = req.query.username; // Имя пользователя
    const videoCount = req.query.videoCount ? parseInt(req.query.videoCount) : 0; // Количество видео, если указано

    if (!username) {
        return res.status(400).json({ error: 'Параметр username обязателен' });
    }

    try {
        // Подготовка входных данных для актора профиля
        const inputProfile = { usernames: [username] };
        const profilePromise = client.actor("apify/instagram-profile-scraper").call(inputProfile);

        let videoPromise = Promise.resolve([]); // По умолчанию пустой массив, если videoCount не указан

        if (videoCount > 0) {
            // Если указан videoCount, подготавливаем запрос для получения видео
            const inputReels = { username: [username], resultsLimit: videoCount };
            videoPromise = client.actor("apify/instagram-reel-scraper").call(inputReels);
        }

        // Ожидание завершения обоих запросов
        const [profileRun, reelRun] = await Promise.all([profilePromise, videoPromise]);

        // Получение данных профиля
        const profileItems = await client.dataset(profileRun.defaultDatasetId).listItems();
        const videoItems = videoCount > 0 ? await client.dataset(reelRun.defaultDatasetId).listItems() : [];

        res.json({
            profileData: profileItems.items, // Данные профиля
            videoData: videoCount > 0 ? videoItems.items : [] // Данные видео
        });
    } catch (error) {
        console.error('Ошибка при получении данных:', error);
        res.status(500).json({ error: 'Ошибка при получении данных' });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
