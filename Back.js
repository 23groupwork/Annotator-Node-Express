const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const corsOptions = {
  origin: ['http://localhost:3000', 'http://annotator.top'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'annatator_database'
});

connection.connect();

// deal with the register
app.post('/api/users/register', (req, res) => {
  const { id, userName, password, major, avatar, roleType } = req.query;

  if (/^\d+$/.test(userName)) {
    res.status(400).json({ error: 'The user name cannot be filled with pure numbers' });
    return;
  }

  // check the number of characters of password
  if (password.length < 6 || password.length > 20) {
    res.status(400).json({ error: 'The passwords must be 6-20 characters' });
    return;
  }

  const sql = `INSERT INTO User (id, user_name, password, major, avatar, roleType) VALUES (?, ?, ?, ?, ?, ?)`;
  connection.query(sql, [id, userName, password, major, avatar, roleType], (error, results) => {
    if (error) {
      console.error('Error in writing data', error);
      res.status(500).json({ error: 'Failed to write data' });
    } else {
      console.log('Data has been successfully written');
      res.status(200).json({ message: 'Data has been successfully written' });
    }
  });
});

app.post('/api/users/registerCheck', (req, res) => {
  const { userName, password } = req.query;
  const sql = `SELECT * FROM User WHERE user_name = ?`;
  connection.query(sql, [userName], (error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        if (/^\d+$/.test(userName)) {
	  res.status(400).json({ error: 'The user name cannot be filled with pure numbers' });
          return;
        }
        // check the number of characters of password
        if (password.length < 6 || password.length > 20) {
          res.status(400).json({ error: 'The passwords must be 6-20 characters' });
          return;
        }
        res.status(200).json({ message: 'Registration successful' });
      } else {
        res.status(400).json({ error: 'The user name already exists' });
      }
    }
});
});

app.post('/api/users/registerStore', (req, res) => {
  const { userName, password, major, avatar, roleType, course_name} = req.body;
  const sql = `INSERT INTO User (user_name, password, major, avatar, roleType) VALUES (?, ?, ?, ?, ?)`;

  connection.query(sql, [userName, password, major, avatar, roleType], (error, results) => {
    if (error) {
      console.error('Error in writing data', error);
      res.status(500).json({ error: 'Failed to write data' });
    } else {
      console.log('Data has been successfully written into User');
      const courseValues = course_name.map(courseName => [userName, courseName]);
      const courseSQL = `insert into User_course (user_name, course_name) values ?`;
      connection.query(courseSQL, [courseValues], (courseError, courseResults) => {
        if (courseError) {
          console.error('Error in writing course data', courseError);
          res.status(500).json({ error: 'Failed to write course data' });
        } else {
          console.log('Data has been successfully written into User_course');
          res.status(200).json({ message: 'Data has been successfully written'})
        }
      });
  }
  });
});

//deal with the login
app.post('/api/users/login', (req, res) => {
  const { userName, password } = req.query;

  const sql = 'SELECT user_name, major, avatar, course_name, roleType FROM (`User` natural join `User_course`) where user_name = ? AND password = ?';
  connection.query(sql, [userName, password], (error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        res.status(401).json({ error: 'Invalid user name or password' });
      } else {
        const users = results.map(user => {
          const { user_name, major, avatar, course_name, roleType } = user;
          return { user_name, major, avatar, course_name, roleType };
        });
        res.status(200).json({ message: 'Login successful', users });
      }
    }
  });
});

app.post('/api/users/course', (req, res) => {
  const { major } = req.query;
  const sql = `select id, value, name, intro from Course where major = ?`;
  connection.query(sql, [major], (error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        res.status(401).json({ error: 'Sorry, no such major' });
      } else {
        const courses = results.map(course => {
          const {id, value, name, intro } = course;
          return {id, value, name, intro };
        });
        res.status(200).json({ message: 'Query seccessful', courses });
        }
     }
    });
  });

//deal with clicking course and return lecture
app.post('/api/users/lecture', (req, res) => {
  const { course_name } = req.query;
  const sql = `select id, title, summary, intro from Lecture where course = ?`;
  connection.query(sql, [course_name], (error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        res.status(401).json({ error: 'Sorry, no such course' });
      } else {
        const lectures = results.map(lecture => {
          const { id, title, summary, intro } = lecture;
          return { id, title, summary, intro };
        });
        res.status(200).json({ message: 'Query seccessful', lectures });
        }
     }
    });
  });


//deal with clicking lecture and return content
app.post('/api/users/content', (req, res) => {
  const { lecture_id } = req.query;
  const sql = `select id, content_detail from Content_section where lecture_id = ?;`;
  connection.query(sql, [lecture_id], (error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        res.status(401).json({ error: 'Sorry, this lecture has no content yet' });
      } else {
        const contents = results.map(content => {
          const { id, content_detail } = content;
          return { id, content_detail };
        });
        res.status(200).json({ message: 'Query seccessful', contents });
      }
    }
  });
});

//deal with getting comments with the corrosponding section
app.post('/api/users/getComment', (req, res) => {
  const { content_id } = req.query;
  const sql = `select comment_id,  comment_user_name, avatar, comment_detail from Comment_section join User 
  on Comment_section.comment_user_name = User.user_name where content_id = ?`;
  connection.query(sql, [content_id],(error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        res.status(401).json({ error: 'There is no comment yet' });
      } else {
        const comments = results.map(comment => {
          const {comment_id,  comment_user_name, avatar, comment_detail } = comment;
          return {comment_id,  comment_user_name, avatar, comment_detail };
        });
        res.status(200).json({ message: 'Query seccessful', comments });
      }
    }
  });
});

//deal with getting replies with the corrosponding comment
app.post('/api/users/getReply', (req, res) => {
  const { comment_id } = req.query;
  const sql = `select reply_user_name, avatar, reply_detail from Reply join User 
  on Reply.reply_user_name = User.user_name where comment_id = ?`;
  connection.query(sql, [comment_id],(error, results) => {
    if (error) {
      console.error('Error in database query', error);
      res.status(500).json({ error: 'Failed to query database' });
    } else {
      if (results.length === 0) {
        res.status(401).json({ error: 'There is no comment yet' });
      } else {
        const replies = results.map(reply => {
          const { reply_user_name, avatar, reply_detail } = reply;
          return { reply_user_name, avatar, reply_detail };
        });
        res.status(200).json({ message: 'Query seccessful', replies });
      }
    }
  });
});

//deal with writting a new comment to the corrosponding content section
app.post('/api/users/writeComment', (req, res) => {
  const { comment_detail,  comment_user_name, content_id } = req.body;
  const sql = `INSERT INTO Comment_section (comment_detail, comment_user_name, content_id) VALUES (?, ?, ?)`;
  connection.query(sql, [comment_detail, comment_user_name, content_id], (error, results) => {
    if (error) {
      console.error('Error in writing data', error);
      res.status(500).json({ error: 'Failed to write data' });
    } else {
      console.log('Data has been successfully written');
      res.status(200).json({ message: 'Data has been successfully written' });
    }
  });
});


//deal with writting a new reply to the corrosponding comment
app.post('/api/users/writeReply', (req, res) => {
  const { comment_id, reply_detail, reply_user_name } = req.query;
  const sql = `INSERT INTO Reply (comment_id, reply_detail, reply_user_name) VALUES (?, ?, ?)`;
  connection.query(sql, [comment_id, reply_detail, reply_user_name], (error, results) => {
    if (error) {
      console.error('Error in writing data', error);
      res.status(500).json({ error: 'Failed to write data' });
    } else {
      console.log('Data has been successfully written');
      res.status(200).json({ message: 'Data has been successfully written' });
    }
  });
});

// Start sever
app.listen(3000, () => {
  console.log('The server has started and is listening on port 3000.');
});

