const axios = require('axios');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');


const getPublications = () => axios.get('http://oro.open.ac.uk/cgi/exportview/research_centre/bsdtag/JSON/bsdtag.js')
    .then(({ data: publications }) => publications)
    .then(publications => publications.map(publicaiton => ({
        ...publicaiton,
        authors: publicaiton.creators
            .map(({ name }) => [name.given, name.family].join(' '))
            .map((name, i, { length }) => {
                const sep = i < length - 2 ? ', ' : ' and ';
                return i !== length - 1 ? `${name}${sep}` : name
            })
            .join(''),
    })));

const getNews = () => axios.get('https://news.kmi.open.ac.uk/rss')
    .then(({ data: publications }) => publications);
const getTweets = getPublications;


// Configure tempates

nunjucks.configure(path.join(__dirname, 'templates'));

Promise.all([getPublications(), getNews(), getTweets()])
    .then(([publications, news, tweets]) => ({ publications, news, tweets }))
    .then(context => {
        const html = nunjucks.render('index.html', context);
        fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
    });