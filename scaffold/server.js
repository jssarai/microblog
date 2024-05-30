const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const dotenv = require('dotenv');
var crypto = require('crypto');

// Load environment variables from .env file
dotenv.config();

// Express app setup
const app = express();
const PORT = 3000;

// Use environment variables for client ID and secret
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, (token, tokenSecret, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


//Initialize Database

// Placeholder for the database file name
const dbFileName = 'microblogData.db';

let db;
let sortBy = 'timestamp';
async function initializeDB() {
    db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    console.log('Opening database file:', dbFileName);

    // Check if the users table exists
    const usersTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users';`);
    if (!usersTableExists) {
        console.log('Users table does not exist.');
    }

    // Check if the posts table exists
    const postsTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='posts';`);
    if (!postsTableExists) {
        console.log('Posts table does not exist.');
    }
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifCond: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);


app.use((req, res, next) => {
    res.locals.appName = "Nature's Island";
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', async (req, res) => {
    let posts =  await getPosts();
    const user = await getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Error route: render error page

app.get('/error', (req, res) => {
    res.render('error');
});


app.post('/posts', async (req, res) => {
    addPost(req.body.title, req.body.content, await getCurrentUser(req));
    res.redirect('/');
});
    
app.post('/like/:id', (req, res) => {updatePostLikes(req, res)});

app.get('/profile', isAuthenticated, async (req, res) => {
    let user =  await getCurrentUser(req);
    let posts = await db.all('SELECT * FROM posts where username = ?', [user.username]);
    res.render('profile', { posts, user });
});

app.get('/avatar/:username', (req, res) => {renderProfile(req, res)});

app.get('/logout', (req, res) => {logoutUser(req, res)});

app.post('/delete/:id', isAuthenticated, (req, res) => {removePost(req, res)});

app.get('/registerUsername', (req, res) => {
    res.render('registerUsername', { regError: req.query.error });
});

//Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }), (req, res) => {
    passport.use (new GoogleStrategy( {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback",
        userProfileURL:
        'https://www.googleapis.com/oauth2/v3/userinfo',
        scope: ['profile']
        }));      
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
    const googleId = req.user.id;
    var hashedGoogleId = crypto.createHash('md5').update(googleId).digest('hex');
    req.session.hashedGoogleId = hashedGoogleId;
    
    // Check if user already exists
    try {
        let localUser = await findUserByHashedGoogleId(hashedGoogleId);
        if (localUser) {
            req.session.userId = localUser.id;
            req.session.loggedIn = true;
            res.redirect('/');
        } else {
            res.redirect('/registerUsername');
        }
    }
    catch(err){
        console.error('Error finding user:', err);
        res.redirect('/error');
    }
});

app.post('/sort', async (req, res) => {
    if(sortBy == req.body.sortBy) {
        return
    }
    sortBy = req.body.sortBy;
    posts = await getPosts();
    res.json({"posts": posts});
});

app.post('/registerUsername', (req, res) => {registerUser(req, res)});

app.get('/googleLogout', (req, res) => {
    res.render('googleLogout');
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Function to find a user by username
async function findUserByUsername(username) {
    let user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if(user) {
        return user
    } else {
        return undefined;
    }
}

// Function to find a user by user ID
async function findUserById(userId) {
    let user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if(user) {
        return user
    } else {
        return undefined;
    }
}

async function findUserByHashedGoogleId(hashedGoogleId) {
    let user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', [hashedGoogleId]);
    if(user) {
        return user
    } else {
        return undefined;
    }
}

// Function to add a new user
async function addUser(username, hashedGoogleId) {
    let user = new Object();
    user.username = username;
    user.avatar_url = generateAvatar(user.username[0].toUpperCase());
    let date = new Date;
    user.memberSince = date.toLocaleString();

    await db.run(
        'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [user.username, hashedGoogleId, user.avatar_url, user.memberSince]
    );
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log(req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

async function registerUser(req, res) {
    const username = req.body.username;
    if (await findUserByUsername(username)) {
        res.redirect('/registerUsername?error=Username+already+exists');
    } else {
        addUser(username, req.session.hashedGoogleId);
        let user = await findUserByUsername(username);
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    //let user = getCurrentUser(req)
    req.session.userId = '';
    req.session.loggedIn = false;
    req.session.hashedGoogleId = null;
    res.redirect('/googleLogout');
}

// Function to render the profile page
function renderProfile(req, res) {
    res.redirect('/profile');
}

// Function to update post likes
async function updatePostLikes(req, res) {
    if (!req.session.loggedIn) {
        return
    }
    let user = getCurrentUser(req);
    let id = req.params.id;
    let change = req.body.change;
    let post = await db.get('SELECT * from posts where id = ?', [id]);
    if (post.username != user.username) {
        if (change == 'increment') {
            await db.run('UPDATE posts SET likes = ? where id = ?', [post.likes + 1, id]);
            post.likes = post.likes + 1;
        } else {
            await db.run('UPDATE posts SET likes = ? where id = ?', [post.likes - 1, id]);
            post.likes = post.likes - 1;
        }
    } 
    res.json({ "postId": post.id, "change": change, "likes": post.likes });

}


async function removePost(req, res) {
    if (!req.session.loggedIn) {
        return
    }
    let user = await getCurrentUser(req);
    let id = req.params.id;
    let post = await db.get('SELECT * from posts where id = ?', [id]);
    if (post.username == user.username) {
        await db.run('DELETE from posts where id = ?', [id])
        res.json({ "postId": id});
    }
}

// Function to get the current user from session
function getCurrentUser(req) {
    return findUserById(req.session.userId);
}

// Function to get all posts, sorted by latest first
async function getPosts() {
    const postsTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='posts';`);
    if (postsTableExists) {
        let posts = undefined;
        if (sortBy == 'timestamp') {
            posts = await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
        } else {
            posts = await db.all('SELECT * FROM posts ORDER BY likes DESC');
        }
        if (posts.length > 0) {
            return posts;
        } else {
            console.log('No posts found.');
        }
    } else {
        console.log('Posts table does not exist.');
    }
}

// Function to add a new post
async function addPost(title, content, user) {
    let post = new Object();
    post.title = title;
    post.content = content;
    post.username = user.username;
    let date = new Date;
    post.timestamp = date.toLocaleString();
    post.likes = 0;
    post.avatar_url = user.avatar_url;
    await db.run(
        'INSERT INTO posts (title, content, username, timestamp, likes, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
        [post.title, post.content, post.username, post.timestamp, post.likes, post.avatar_url]
    );
}



// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    let bgc = 'green';
    if (letter <= 'F') {
        bgc = 'red';
    } else if (letter <= 'L') {
        bgc = 'blue';
    } else if (letter <= 'R') {
        bgc = 'yellow';
    }

    let can = canvas.createCanvas(width, height);
    let context = can.getContext("2d");

    context.fillStyle = bgc;
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'white';
    context.font = '60px Times New Roman';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, (can.width / 2), (can.height / 2));
    let url = can.toDataURL();
    return url;
}