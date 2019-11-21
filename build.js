const axios = require('axios');

const getPublications = () => axios.get('http://oro.open.ac.uk/cgi/exportview/research_centre/bsdtag/JSON/bsdtag.js')
    .then(({ data: publications }) => publications);

const getNews = () => axios.get('https://news.kmi.open.ac.uk/rss')
    .then(({ data: publications }) => publications);
const getTweets = getPublications;

Promise.all([getPublications(), getNews(), getTweets()])
    .then(([publications, news, tweets]) => console.log(publications.length, news, tweets.length));