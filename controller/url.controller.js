const urlSchema = require('../model/url.model');
const crypto = require('crypto');
const redisService = require('../services/radis.service');

const createShortURL = async (req, res) => {
    try {
        const data = req.body;
        const key = Object.keys(data);
        if (key.length > 0) {
            if (!(key.length == 1 && key == 'longUrl')) {
                return res.status(400).send({
                    status: false,
                    message: 'Only longUrl field is allowd !'
                });
            }
        }
        const getRedisRes = await redisService.GET_ASYNC(data.longUrl);
        if (getRedisRes) {
            return res.status(201).send({
                status: true,
                message: 'success [Redis]',
                data: JSON.parse(getRedisRes)
            });
        }
        else {
            const fetchRes = await urlSchema.findOne(data);
            if (fetchRes) {
                await redisService.SET_ASYNC(fetchRes.longUrl, JSON.stringify(fetchRes), 'EX', 60 * 60 * 24)
                return res.status(201).send({
                    status: true,
                    message: 'success [MongoDB]',
                    data: fetchRes
                });
            }
            else {
                let urlCode = crypto.randomBytes(4).toString('base64');

                urlCode = await uniqueUrlCode(urlCode);
                urlCode = urlCode.toLowerCase();

                const domain = req.protocol + "://" + req.get('host');
                const shortUrl = domain + "/" + urlCode;

                data.urlCode = urlCode;
                data.shortUrl = shortUrl;

                const dataRes = await urlSchema.create(data);
                await redisService.SET_ASYNC(dataRes.longUrl, JSON.stringify(dataRes), 'EX', 60 * 60 * 24);
                return res.status(201).send({
                    status: true,
                    message: 'success [MongoDB]',
                    data: dataRes
                });
            }
        }
    } catch (error) {
        if (error['errors'] != null) {
            const key = Object.keys(error['errors']);
            return res.status(400).send({
                status: false,
                message: error['errors'][key[0]].message
            });
        }
        return res.status(500).send({
            status: false,
            message: error
        });
    }
}

async function uniqueUrlCode(urlCode) {
    const checkRes = await urlSchema.findOne({
        urlCode: urlCode
    });
    if (checkRes != null) {
        const urlCode = crypto.randomBytes(4).toString('base64');
        uniqueUrlCode(urlCode);
    }
    else {
        return urlCode;
    }
}

const redirectToOriginalURL = async (req, res) => {
    try {
        const urlCode = req.params.urlCode;
        if (urlCode.length != 8) {
            return res.status(400).send({
                status: false,
                message: 'Please enter a valid urlCode !'
            });
        }
        const getRedisRes = await redisService.GET_ASYNC(urlCode);
        if (getRedisRes) {
            console.log("redis work...");
            res.redirect(301, getRedisRes);
            return false;
        }
        const urlRes = await urlSchema.findOne({
            urlCode: urlCode
        });
        if (!urlRes) {
            return res.status(404).send({
                status: false,
                message: 'URL not found !'
            });
        }
        console.log("mongoDb work...");
        await redisService.SET_ASYNC(urlRes.urlCode, urlRes.longUrl, 'EX', 60 * 60 * 24);
        res.redirect(301, urlRes.longUrl);

    } catch (error) {
        return res.status(500).send({
            status: false,
            message: error
        });
    }
}

module.exports = {
    createShortURL,
    redirectToOriginalURL
}