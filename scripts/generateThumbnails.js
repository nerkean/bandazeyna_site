import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к папкам
const PUBLIC_DIR = path.join(__dirname, '../public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const THUMBS_DIR = path.join(ASSETS_DIR, 'thumbnails');

// Конфигурация
const FOLDERS_TO_PROCESS = ['frames', 'backgrounds'];
const TARGET_WIDTH = 160; // Размер миниатюры (px)
const QUALITY = 80;       // Качество WebP

async function processImages() {
    console.log('🚀 Начинаю генерацию миниатюр...');

    // Создаем папки для миниатюр, если их нет
    if (!fs.existsSync(THUMBS_DIR)) fs.mkdirSync(THUMBS_DIR);
    
    for (const folder of FOLDERS_TO_PROCESS) {
        const sourcePath = path.join(ASSETS_DIR, folder);
        const targetPath = path.join(THUMBS_DIR, folder);

        if (!fs.existsSync(sourcePath)) {
            console.warn(`⚠️ Папка не найдена: ${sourcePath}`);
            continue;
        }
        if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath);

        const files = fs.readdirSync(sourcePath);

        for (const file of files) {
            if (!file.match(/\.(png|jpg|jpeg|webp)$/i)) continue;

            const inputFile = path.join(sourcePath, file);
            // Сохраняем всегда в .webp для экономии места
            const outputFile = path.join(targetPath, file.replace(/\.(png|jpg|jpeg)$/i, '.webp'));

            try {
                // Если миниатюра уже есть и она новее оригинала — пропускаем
                if (fs.existsSync(outputFile)) {
                   // Можно добавить проверку даты изменения, но для простоты перезапишем
                   // или просто пропустим, если файл существует
                   // continue; 
                }

                await sharp(inputFile)
                    .resize(TARGET_WIDTH) // Уменьшаем ширину, высота авто
                    .webp({ quality: QUALITY })
                    .toFile(outputFile);

                console.log(`✅ [${folder}] Создана миниатюра: ${file}`);
            } catch (err) {
                console.error(`❌ Ошибка с файлом ${file}:`, err);
            }
        }
    }
    console.log('✨ Готово! Миниатюры созданы в /public/assets/thumbnails');
}

processImages();