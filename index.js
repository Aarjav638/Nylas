import Express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config'
const app = Express();
app.use(cors());
app.use(Express.json());

app.use(morgan('dev'));


const nylasConfig = {
    clientId: process.env.CLIENT_ID,
    apiKey: process.env.API_KEY,
    apiUri: process.env.API_URI,
}



app.get('/', (req, res) => {
    res.send('Hello World');
    }
);


app.listen(3000, () => {
    console.log('Server is running on port 3000');
    }
);
