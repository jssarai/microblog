const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

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

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
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
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement

/*
app.get('/post/:id', (req, res) => {
    // TODO: Render post detail page
});
*/
app.post('/posts', (req, res) => {
    // TODO: Add a new post and redirect to home
    addPost(req.body.title, req.body.content, getCurrentUser(req));
    res.redirect('/');
});
    
    

app.post('/like/:id', (req, res) => {updatePostLikes(req, res)});

app.get('/profile', isAuthenticated, (req, res) => {
    // TODO: Render profile page
    let user = getCurrentUser(req);
    res.render('profile', { user });
});
app.get('/avatar/:username', (req, res) => {renderProfile(req, res)});
    // TODO: Serve the avatar image for the user

app.post('/register', (req, res) => {registerUser(req, res)});

app.post('/login', (req, res) => {loginUser(req, res)});

app.get('/logout', (req, res) => {logoutUser(req, res)});

app.post('/delete/:id', isAuthenticated, (req, res) => {removePost(req, res)});
    // TODO: Delete a post if the current user is the owner

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users



let posts = [
    { id: 1, title: 'Sample Post', content: 'This is a sample post.', username: 'SampleUser', timestamp: '01/01/2024, 10:00:00 AM', likes: 0, avatar_url: 'data:image/png;base64,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'},
    { id: 2, title: 'Another Post', content: 'This is another sample post.', username: 'AnotherUser', timestamp: '02/01/2024, 12:00:00 PM', likes: 0, avatar_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAFN0lEQVR4nO2bXUgUXRjH/9O+GGWWWa0UZEFk0IXtRZBgdZdGEd2k1JUUVrpClFDRdXTTXSDVRURBUVEERRIoXYRk0E30QfRBFOxFZWW0rVLm7vNenLdmphltdj275zm+zw8eGM/MnI/5nWfGObvrEEAQ2DDNdAcEPyKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGXYLcRygqwtYutR0T/RBAFkbTU1EREQnTpjvi6awW8jNm0pIOk1UUWG+PxrC3ltWTQ2waZParqgAduww2x9N2CukowOIxdy/k0lzfdGIQ7DwF1RlZUAqBcTj/vKGBmBgwEyfNGFnhrS0BGUAUyJL7MyQ+/eB+vpg+eioerZ8+FD6PmnCvgxJJMJlAOpWtmtXafujGfuEdHa623fuBPfv2eN/2NuG6f+784rKSqJMRr17DA0RzZtH9OkTBdiyxXxf/xfvITt3AuXlavvMGeDzZ+DcueBxHR0l7ZZWTM+IyOE4RC9eqAzI5YiWL1fly5YRZbP+DPHutyzsyZDGRqC2Vm3fvg28eqW2X78G+vr8xzoOsHt3afunC9MzInLcuOFmwObN/n1btwafI0NDRDNnmu93nmGHkJoaorExdaHfviWKxfz7YzGiN2+CUlpbzfc9z7DjltXe7v4re+oUkM3692ez6iH/JzY+3E3PiL9GWRnR+/dqxn//ThSPhx+3YIHa/yerV5sfw5TKkJYWoLpabV+5AgwOhh/38SNw/Xqw3LYsMT0j/hoDA+5sX7Nm4mPXrQtmyMgIUVWV+XFEDN5CEgn3wj58GO2cx4+DUrq6zI8lYvC+ZXnXrbq7o51z+nSwLJkEpvEe6m9Mz4hxw7tu9eULUXl5tPNmzSL6+jWYJY2N5sdkdYZ4163OngWGh6Odl8kAFy4Ey215uJueEaHhOETPn6uZncsR1dbmd/7Kleo8L2NjREuWmB+blRmyYQOwYoXa7usDXr7M7/xnz4D+fn9ZLAa0tenpXxH5x3QHQvHeXkZGgMOH868jnQ6WtbUBR4+qj3q5YjpFA+FdtyoG27ebH+MEwS9D9u511616eoCnTwuvK5EAmpr8ZckkcPly4XUWG9MzwhfedasfP4iqqydX3+LF4dlWV2d+rOMEr4d6c7O7bnXt2uS/zpNKAbduBcvb2ydXbzExPSN8ce+eO4sbGvTU+esb8l6+fSOaPdv8eEOCj5BVq9wL9uiRvnq9n8V76ew0P+aQ4HPL2rfP3T55Ul+9RHZ9eGV6RhBAtGiR++FSOq3Wo3TWH48TjY4Gs2TjRvNjZ5khBw4A06er7atX1XqUTgYHgd7eYPmRI3rb0YHpGUGVlf7V2WKtyra2hr8orl1rPCu8YV7I8eP+CzR/fnHaqasLF3L3rnrwm74O/4XZW1Z9PbB/v79szpzitOU44eXr1wMHDxanzUIwNhu2bXPfyr309xMtXKi3raoqot7e8AwhUkv1x46x+OFoaYXMmEF08SLRu3fjXxwitdzx4AHRpUtEzc2FtTV3LlF3N1FPD9Hw8MTt/SKdVt+QPHTImJDSLy6mUsD589GPz+UKbyuTAZ48UZEPP38W3uYksfMnbVMYHu8hwm9ECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDP+BaAWl8h9XJZeAAAAAElFTkSuQmCC'},
];

let users = [];
/*
let users = [
    { id: 1, username: 'SampleUser', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'AnotherUser', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];
*/
// Function to find a user by username
function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    let user = users.find(e => e.username === username);
    if(user) {
        return user
    } else {
        return undefined;
    }
}

// Function to find a user by user ID
function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    let user = users.find(e => e.id === userId);
    if(user) {
        return user
    } else {
        return undefined;
    }
}

// Function to add a new user
function addUser(username) {
    // TODO: Create a new user object and add to users array
    let user = new Object();
    user.username = username;
    user.id = users.length+1;
    user.posts = [];
    user.likes = [];
    user.avatar_url = null;
    let date = new Date;
    user.memberSince = date.toLocaleString();
    users.push(user)
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


// Function to register a user
function registerUser(req, res) {
    const username = req.body.username;
    if (findUserByUsername(username)) {
        res.redirect('/register?error=Username+already+exists');
    } else {
        addUser(username);
        res.redirect('/login');
    }
}

// Function to login a user
function loginUser(req, res) {
    // TODO: Login a user and redirect appropriately
    const username = req.body.username;
    let user = findUserByUsername(username);
    if (user) {//valid
        req.session.userId = user.id;
        req.session.loggedIn = true;
        handleAvatar(req);
        res.redirect('/');
    } else {//invalid user
        res.redirect('/login?error=Username+does+not+exist');
    }
}

// Function to logout a user
function logoutUser(req, res) {
    let user = getCurrentUser(req)
    req.session.userId = '';
    req.session.loggedIn = false;
    res.redirect('/');

    // TODO: Destroy session and redirect appropriately
}

// Function to render the profile page
function renderProfile(req, res) {
    handleAvatar(req);
    res.redirect('/profile');
    // TODO: Fetch user posts and render the profile page
}

// Function to update post likes
function updatePostLikes(req, res) {
    if (!req.session.loggedIn) {
        return
    }
    let user = getCurrentUser(req);
    let id = req.params.id;
    let change = req.body.change;
    let post = posts.find(e => e.id == id);
    if (!(user.posts.includes(post))) {
        if (change == 'increment') {
            post.likes = post.likes + 1;
            user.likes.push(post);
        } else {
            post.likes = post.likes - 1;
            user.likes = user.likes.filter(e => e.id != id); 
        }
    } 
    res.json({ "postId": post.id, "change": change, "likes": post.likes });
    // TODO: Increment post likes if conditions are met

}

function removePost(req, res) {
    if (!req.session.loggedIn) {
        return
    }
    let user = getCurrentUser(req);
    let id = req.params.id;
    let post = posts.find(e => e.id == id);
    if (post.username === user.username) {
        posts = posts.filter(e => e.id != id); 
        delete post;
        res.json({ "postId": id});
    }
}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    let user = getCurrentUser(req);
    if (!user.avatar_url) {
        user.avatar_url = generateAvatar(user.username[0].toUpperCase());
    }
    console.log(user)
    console.log(user.avatar_url)
    // TODO: Generate and serve the user's avatar image
}

// Function to get the current user from session
function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    return findUserById(req.session.userId);
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    // TODO: Create a new post object and add to posts array
    let post = new Object();
    post.id = posts[posts.length-1].id+1;
    post.title = title;
    post.content = content;
    post.username = user.username;
    let date = new Date;
    post.timestamp = date.toLocaleString();
    post.likes = 0;
    post.avatar_url = user.avatar_url;
    posts.push(post);

    user.posts.push(post);
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
    //context.fill();
    let url = can.toDataURL();
    console.log(can);
    console.log(url);
    return url;
    // TODO: Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer
}