const axios = require('axios');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

const FeedParser = require('feedparser');
const request = require('request'); // for fetching the feed


const getNews = (url = 'https://news.kmi.open.ac.uk/rostra/rdfall.php?r=11') => new Promise((resolve, reject) => {
    const req = request(url);
    const feedparser = new FeedParser();

    req.on('error', reject);
    req.on('response', res => {
        if (res.statusCode !== 200)
            req.emit('error', new Error('Bad status code'));
        else
            req.pipe(feedparser);
    });

    const collection = [];

    feedparser.on('error', reject);
    feedparser.on('readable', () => {
        let item;
        while (item = feedparser.read()) collection.push(item);
    });
    feedparser.on('finish', () => {
        console.log((collection[0]))
        resolve(collection)
    })
});

const getPublications = () => axios.get('http://oro.open.ac.uk/cgi/exportview/research_centre/bsdtag/JSON/bsdtag.js')
    .then(({data: publications}) => publications)
    .then(publications => publications
        .map(publication => ({
            ...publication,
            year: Number.parseInt(publication.rioxx2_publication_date) || null,
        }))
        .sort((a, b) => a.year - b.year)
    );


// const getNews = () => axios.get('https://news.kmi.open.ac.uk/rostra/rdfall.php?r=2')
//     .then(({data: news}) => news);
// const getTweets = getPublications;


// Configure tempates

nunjucks.configure(path.join(__dirname, 'templates'));

Promise.all([getNews(), getPublications()])
    .then(([news, publications]) => ({ news, publications }))
    .then(context => {
        const html = nunjucks.render('index.html', context);
        fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
    });

// Promise.all([getPublications()])
//     .then(([publications]) => ({publications}))
//     .then(context => {
//         const html = nunjucks.render('index.html', context);
//         fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
//     });

