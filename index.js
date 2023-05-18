const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const sequelize = require('./bd.js');

const token = '6095659226:AAGtGWmZagb4c_PHl3nf_SJmO_5mYKIMzN8';
const webAppUrl = 'https://4dab-89-22-175-236.ngrok-free.app';

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

sequelize.authenticate();

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        await bot.sendMessage(chatId, "Добро пожаловать магазин цифровых товаров 'Digital reflect'. Здесь Вы можете найти множество игр, онлайн-подписки на различные сервисы, изображения,электронные книги, программное обеспечение, шрифты, значки и многое другое. \n \n Чтобы зайти в каталог нашего магазина и оформить заказ, нажмите — /shop", {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [[{text: 'Написать в поддержку', one_time_keyboard: true}]]
            }
        })
    }

    if (text === '/shop') {
        await bot.sendMessage(chatId, 'Заходи в наш интернет магазин по кнопке ниже', {
            reply_markup: {
                one_time_keyboard: true, inline_keyboard: [[{text: 'Открыть каталог', web_app: {url: webAppUrl}}]]
            }
        })
    }

    if (text === '/support' || text === 'Написать в поддержку') {
        await bot.sendMessage(chatId, 'Если у вас есть какие-то вопросы, то вы можете написать в службу поддержки: @demyanchikov', {
            reply_markup: {
                one_time_keyboard: true,
                inline_keyboard: [[{text: 'Написать в поддержку', url: "https://t.me/demyanchikov"}]]
            }
        })
    }

    if (text === '/pay') {
        await bot.sendMessage(chatId, `Оплатите товар удобным вам способом на сумму ${globaltotalPrice} рублей: \n \n QIWI: +79082174275 \n \n Номер банковской карты: 4279 3806 8145 5467  \n \n По завершению оплаты, нажмите на кнопку ниже, менеджер проверит необходимые данные и свяжеться с вами`, {
            reply_markup: {
                one_time_keyboard: true, inline_keyboard: [[{text: 'Оплачено', url: "https://t.me/demyanchikov"}]]
            }
        })
    }

    if (msg?.web_app_data?.data) {
        try {
            setTimeout(async () => {
                await bot.sendMessage(chatId, 'Можете ознакомиться с каталогом товаров и сделать заказ!'), {
                    one_time_keyboard: true
                }
            }, 3000)
        } catch (e) {
            console.log(e);
        }
    }
});

let globalProducts = [];
let globaltotalPrice = 0;

app.post('/web-data', async (req) => {
    const {products, totalPrice} = req.body;
    globalProducts = products;
    globaltotalPrice = totalPrice;
})

app.post('/web-form', async (req, res) => {
    const {queryId, surname, name, phone, email} = req.body;
    try {
        await sequelize.query('insert into user (surname, name, phone, email, user_type_id) values(?, ?, ?, ?, 1)', {
            replacements: [surname, name, phone, email],
        });
        const [users] = await sequelize.query('SELECT * FROM user where email = ?', {
            replacements: [email]
        });
        const user = users[0];

        // await sequelize.query('insert into order (status_id, user_id) values(3, ?, ?, ?, 1)', {
        //     replacements: [surname, user_id],
        // });

        await bot.answerWebAppQuery(queryId, {
            type: 'article', id: queryId, title: 'Успешная покупка', input_message_content: {
                message_text: `Заказ оформлен, вы приобрели ${globalProducts.map(item => item.title).join(', ')} на сумму ${globaltotalPrice} \n \n Персональные данные: \n Фамилия: ${surname} \n Имя: ${name} \n Телефон: ${phone} \n E-mail: ${email} \n \n  Для оплаты заказа, введите команду /pay`
            }
        })
        return res.status(200).json({});
    } catch (e) {
        return res.status(500).json({})
    }
})

app.get('/products', async (req, res) => {
    const [products] = await sequelize.query('SELECT * FROM PRODUCT');
    return res.status(200).json({products: products});
})

app.post('/products', async (req, res) => {
    const {nominations, descriptions, prices, periods, countries, category_id, provider_id} = req.body;
    const product_id = await sequelize.query('insert into product (nomination, description, price, period_of_action, country_producer) values(?, ?, ?, ?, ?); LAST_INSERT_ID();', { //todo
        replacements: [nominations, descriptions, prices, periods, countries],
    });


    await sequelize.query('insert into product_has_category (product_id, category_id) values(?, ?)', {
        replacements: [product_id, category_id],

    });
    await sequelize.query('insert into provider_has_products (provider_id, product_id) values(?, ?)', {
        replacements: [provider_id, product_id],
    });
    return res.status(200).json({});
})

app.post('/categories', async (req, res) => {
    const {nomination} = req.body;
    await sequelize.query('insert into category (nomination) values(?)', {
        replacements: [nomination],
    });
    return res.status(200).json();
})

app.get('/categories', async (req, res) => {
    const [categories] = await sequelize.query('SELECT * FROM category');
    return res.status(200).json({categories: categories});
})

app.post('/categories', async (req, res) => {
    const {nomination} = req.body;

    await sequelize.query('insert into category (nomination) values(?)', {
        replacements: [nomination],
    });
    return res.status(200).json();
})

app.post('/providers', async (req, res) => {
    const {name, surname} = req.body;

    await sequelize.query('insert into provider (name, surname) values(?, ?)', {
        replacements: [name, surname],
    });
    return res.status(200).json();
})

app.get('/productsCategory', async (req, res) => {
    const {categoryId} = req.query;
    console.log(categoryId);
    const [products] = await sequelize.query(`SELECT p.*
                                              FROM product as p,
                                                   product_has_category as pc
                                              where p.id = pc.category_id
                                                and p.id = ${categoryId}`);
    return res.status(200).json({products: products});
})

app.get('/providers', async (req, res) => {
    const [providers] = await sequelize.query('SELECT * FROM provider');
    return res.status(200).json({providers: providers});
})

app.post('/providers', async (req, res) => {
    const {name, surname} = req.body;

    await sequelize.query('insert into provider (name, surname) values(?, ?)', {
        replacements: [name, surname],
    });
    return res.status(200).json();
})

const PORT = 3001;

app.listen(PORT, () => console.log('server started on PORT ' + PORT));