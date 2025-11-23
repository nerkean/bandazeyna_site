import mongoose from 'mongoose';
import BetaUser from '../models/BetaUser.js'; // Путь поправь если надо
import 'dotenv/config';

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected.');

        // Создаем юзера
        await BetaUser.create({
            username: 'admin',
            password: '123' // Тут твой пароль
        });

        console.log('User created!');
        process.exit();
    });