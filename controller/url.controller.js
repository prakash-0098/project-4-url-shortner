const urlSchema = require('../model/url.model');
const crypto = require('crypto');

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
        let urlCode = crypto.randomBytes(4).toString('base64');

        urlCode = await uniqueUrlCode(urlCode);

        const domain = req.protocol + "://" + req.get('host');
        const shortUrl = domain + "/" + urlCode;

        data.urlCode = urlCode;
        data.shortUrl = shortUrl;

        const dataRes = await urlSchema.create(data);
        return res.status(201).send({
            status: true,
            message: 'success',
            data: dataRes
        })
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
        const urlRes = await urlSchema.findOne({
            urlCode: urlCode
        });
        if (!urlRes) {
            return res.status(404).send({
                status: false,
                message: 'URL not found !'
            });
        }
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