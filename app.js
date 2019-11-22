const axios = require('axios');
const express = require('express');
const nunjucks = require('nunjucks');
const app = express();

nunjucks.configure(__dirname, {
    autoescape: true,
    express: app
});

const getPublications = () => axios.get('http://oro.open.ac.uk/cgi/exportview/research_centre/bsdtag/JSON/bsdtag.js')
    .then(({ data: publications }) => publications);

app.get('/', async (req, res) => {
    const publications = await getPublications();
    return res.render('index.html', { publications }) ;
});


app.listen(3000);