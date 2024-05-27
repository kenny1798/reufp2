const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname + '/public')));
app.set('view engine', 'html');

app.get('/', (req,res) => {
    res.render(path.join(__dirname + '/public/index.html'));
})

app.use((req,res) => {
    res.status(404).render(path.join(__dirname + '/public/404.html'))
})

app.listen(3002, () => {
        console.log('Server running on port 3002');
});
