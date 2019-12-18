const axios = require('axios');
const fs = require('fs');
const nunjucks = require('nunjucks');
const path = require('path');

const FeedParser = require('feedparser');
const request = require('request'); // for fetching the feed

const teamMembers = [
    'Petr Knoth',
    'Nancy Pontika',
    'Drahomira Herrmannova',
    'David Pride',
    'Lucas Anastasiou',
    'Bikash Gyawali',
    'Josef Harag',
    'Catherine Kuliavets',
    'Samuel Pearce',
    'Svetlana Rumyanceva',
];

const authorSet = new Set(teamMembers);
const textTokens = [
    'CORE',
    ...teamMembers,
];


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
        console.log((collection[0]));
        resolve(collection)
    })
})
    .then(news => news.map(item => ({
        ...item,
        author: item['dc:creator']['foaf:person']['foaf:name']['#'],
        thumbnail: item['media:thumbnail'] ? item['media:thumbnail']['@']['resource'] : null,
    })))
    .then(news => news
        .filter(({ author, title, summary }) =>
            authorSet.has(author) || textTokens.some(token => {
                const regexp = new RegExp(`\\b${token}\\b`);;
                return regexp.test(title) || regexp.test(summary);
            })
        )
        // use all news
        // .slice(0, 10)
    );

const getPublications = () => axios.get('http://oro.open.ac.uk/cgi/exportview/research_centre/bsdtag/JSON/bsdtag.js')
    .then(({data: publications}) => publications)
    .then(publications => publications
        .map(publication => ({
            ...publication,
            year: Number.parseInt(publication.rioxx2_publication_date) || null,
        }))
        .sort((a, b) => a.year - b.year)
    );


// Configure tempates

nunjucks.configure(path.join(__dirname, 'templates'));

Promise.all([getNews(), getPublications()])
    .then(([news, publications]) => ({news, publications}))
    .then(context => {
        const html = nunjucks.render('index.html', context);
        fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
    });

