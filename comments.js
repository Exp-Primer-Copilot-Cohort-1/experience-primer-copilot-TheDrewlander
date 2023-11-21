// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

// Create express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store all comments
const commentsByPostId = {};

// Route to handle GET requests to '/posts/:id/comments'
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Route to handle POST requests to '/posts/:id/comments'
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id for comment
  const commentId = require('crypto').randomBytes(4).toString('hex');
  // Get comment content from request body
  const { content } = req.body;
  // Get comments for post with id from request params
  const comments = commentsByPostId[req.params.id] || [];
  // Add new comment to comments array
  comments.push({ id: commentId, content, status: 'pending' });
  // Update comments for post with id from request params
  commentsByPostId[req.params.id] = comments;
  // Send response
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  res.status(201).send(comments);
});

// Route to handle POST requests to '/events'
app.post('/events', async (req, res) => {
  console.log('Received Event', req.body.type);
  const { type, data } = req.body;
  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => comment.id === id);
    comment.status = status;
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, postId, status, content },
    });
  }
  res.send({});
});

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001');
});