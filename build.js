const fs = require('fs');
const path = require('path');

const axios = require('axios');
const fm = require('front-matter');
const nunjucks = require('nunjucks');
const remark = require('remark');
const remarkHtml = require('remark-html');
const yaml = require('js-yaml');

const FeedParser = require('feedparser');
const request = require('request'); // for fetching the feed

// Settings
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMPLATES_DIR = path.join(__dirname, 'templates');


const readYaml = (filepath) => {
    const file = fs.readFileSync(filepath, 'utf8');
    const data = yaml.safeLoad(file);
    return data;
};

const readMarkdown = (filepath) => new Promise((resolve, reject) => {
    const file = fs.readFileSync(filepath, 'utf8');
    const rawData = fm(file);

    remark()
        .use(remarkHtml)
        .process(rawData.body, function (error, html) {
            if (error != null) {
                reject(error)
                return;
            }

            const data = {
                ...rawData.attributes,
                body: html,
            };

            resolve(data);
        })
});

const retrieveRdf = (url) => new Promise((resolve, reject) => {
    const options = {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    }
    const req = request(url, options);
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
        resolve(collection)
    });
});

const retrieveNews = (url = 'https://blog.kmi.open.ac.uk/projects/CORE/feed/') => retrieveRdf(url)
    .then(news => news.map(item => ({
        ...item,
        author: item['rss:author']['#'],
        thumbnail: item['rss:image'] ? item['rss:image']['@'] : null,
    })))

const retrievePublications = () => axios.get('http://oro.open.ac.uk/cgi/exportview/research_centre/bsdtag/JSON/bsdtag.js')
    .then(({ data: publications }) => publications)
    .then(publications => publications
        .map(publication => ({
            ...publication,
            year: Number.parseInt(publication.rioxx2_publication_date) || null,
        }))
        .sort((a, b) => b.year - a.year)
    );

const loadContext = async () => {
    const team = await readYaml(path.join(DATA_DIR, 'team.yml'));
    const mission = await readMarkdown(path.join(DATA_DIR, 'mission.md'));
    const research = await readMarkdown(path.join(DATA_DIR, 'research.md'));
    const projects = await readYaml(path.join(DATA_DIR, 'projects.yml'));

    const publications = await retrievePublications();

    const news = await retrieveNews('https://blog.kmi.open.ac.uk/projects/CORE/feed/')
        // .then(news => {
        //     const teamMembers = team.members.map(member => member.name);
        //     const authorSet = new Set(teamMembers);
        //     const textTokens = [
        //         'CORE',
        //         ...teamMembers,
        //     ];
        //     console.log(news)
        //     return news.filter(({ author, title, summary }) =>
        //         authorSet.has(author) || textTokens.some(token => {
        //             const regexp = new RegExp(`\\b${token}\\b`);;
        //             return regexp.test(title) || regexp.test(summary);
        //         })
        //     )
        // });
    projects.items = projects.items.filter(({ hidden }) => !hidden)

    const context = {
        mission,
        research,
        team,
        news,
        publications,
        projects,
    };

    return context;
}

const runBuild = async () => {
    const context = await loadContext();

    nunjucks.configure(TEMPLATES_DIR);
    const html = nunjucks.render('index.html', context);
    fs.writeFileSync(path.join(PUBLIC_DIR, 'index.html'), html);
}

runBuild();
