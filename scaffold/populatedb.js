// populatedb.js
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
// Placeholder for the database file name
const dbFileName = 'microblogData.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL,
            avatar_url TEXT
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            postid INTEGER NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            avatar_url TEXT,
            likes INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS followers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            followee TEXT NOT NULL,
            follower TEXT NOT NULL
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'user1', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-01-01 12:00:00' },
        { username: 'user2', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 12:00:00' }
    ];


    const posts = [
        { id: 1, title: 'HackDavis Information Session', content: 'Come to our information session this Sunday 6/9 at TLC 1010.', username: 'Sarah H.', timestamp: '01/01/2024, 10:00:00 AM', likes: 0, avatar_url: 'data:image/png;base64,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'},
        { id: 2, title: 'Football Game', content: 'Footbal game this thursday June 6th at 6 PM vs. Sac State! Coe support the Aggies!', username: 'Aggie Athletics', timestamp: '02/01/2024, 12:00:00 PM', likes: 0, avatar_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAFN0lEQVR4nO2bXUgUXRjH/9O+GGWWWa0UZEFk0IXtRZBgdZdGEd2k1JUUVrpClFDRdXTTXSDVRURBUVEERRIoXYRk0E30QfRBFOxFZWW0rVLm7vNenLdmphltdj275zm+zw8eGM/MnI/5nWfGObvrEEAQ2DDNdAcEPyKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGSKEGXYLcRygqwtYutR0T/RBAFkbTU1EREQnTpjvi6awW8jNm0pIOk1UUWG+PxrC3ltWTQ2waZParqgAduww2x9N2CukowOIxdy/k0lzfdGIQ7DwF1RlZUAqBcTj/vKGBmBgwEyfNGFnhrS0BGUAUyJL7MyQ+/eB+vpg+eioerZ8+FD6PmnCvgxJJMJlAOpWtmtXafujGfuEdHa623fuBPfv2eN/2NuG6f+784rKSqJMRr17DA0RzZtH9OkTBdiyxXxf/xfvITt3AuXlavvMGeDzZ+DcueBxHR0l7ZZWTM+IyOE4RC9eqAzI5YiWL1fly5YRZbP+DPHutyzsyZDGRqC2Vm3fvg28eqW2X78G+vr8xzoOsHt3afunC9MzInLcuOFmwObN/n1btwafI0NDRDNnmu93nmGHkJoaorExdaHfviWKxfz7YzGiN2+CUlpbzfc9z7DjltXe7v4re+oUkM3692ez6iH/JzY+3E3PiL9GWRnR+/dqxn//ThSPhx+3YIHa/yerV5sfw5TKkJYWoLpabV+5AgwOhh/38SNw/Xqw3LYsMT0j/hoDA+5sX7Nm4mPXrQtmyMgIUVWV+XFEDN5CEgn3wj58GO2cx4+DUrq6zI8lYvC+ZXnXrbq7o51z+nSwLJkEpvEe6m9Mz4hxw7tu9eULUXl5tPNmzSL6+jWYJY2N5sdkdYZ4163OngWGh6Odl8kAFy4Ey215uJueEaHhOETPn6uZncsR1dbmd/7Kleo8L2NjREuWmB+blRmyYQOwYoXa7usDXr7M7/xnz4D+fn9ZLAa0tenpXxH5x3QHQvHeXkZGgMOH868jnQ6WtbUBR4+qj3q5YjpFA+FdtyoG27ebH+MEwS9D9u511616eoCnTwuvK5EAmpr8ZckkcPly4XUWG9MzwhfedasfP4iqqydX3+LF4dlWV2d+rOMEr4d6c7O7bnXt2uS/zpNKAbduBcvb2ydXbzExPSN8ce+eO4sbGvTU+esb8l6+fSOaPdv8eEOCj5BVq9wL9uiRvnq9n8V76ew0P+aQ4HPL2rfP3T55Ul+9RHZ9eGV6RhBAtGiR++FSOq3Wo3TWH48TjY4Gs2TjRvNjZ5khBw4A06er7atX1XqUTgYHgd7eYPmRI3rb0YHpGUGVlf7V2WKtyra2hr8orl1rPCu8YV7I8eP+CzR/fnHaqasLF3L3rnrwm74O/4XZW1Z9PbB/v79szpzitOU44eXr1wMHDxanzUIwNhu2bXPfyr309xMtXKi3raoqot7e8AwhUkv1x46x+OFoaYXMmEF08SLRu3fjXxwitdzx4AHRpUtEzc2FtTV3LlF3N1FPD9Hw8MTt/SKdVt+QPHTImJDSLy6mUsD589GPz+UKbyuTAZ48UZEPP38W3uYksfMnbVMYHu8hwm9ECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDNECDP+BaAWl8h9XJZeAAAAAElFTkSuQmCC'},
    ];

    const comments = [
        { id: 1, postid: 1, content: 'Food and Drink will be provided!', username: 'Sarah H.', timestamp: '01/02/2024, 10:00:00 AM', avatar_url: 'data:image/png;base64,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', likes: 0},
      ];


    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes, post.avatar_url]
        );
    }));

    await Promise.all(comments.map(comment => {
        return db.run(
            'INSERT INTO comments (postid, content, username, timestamp, avatar_url, likes) VALUES (?, ?, ?, ?, ?, ?)',
            [comment.postid, comment.content, comment.username, comment.timestamp, comment.avatar_url, comment.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});