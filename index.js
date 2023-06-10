const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: 'https://www.delibhai.com',
};
// Middleware
app.use(express.json());
app.use(cors(corsOptions));
const verifyJWT = (req, res, next) => {
  const auth = req.headers.authorization;
  const userEmail = req.query.email;
  if (!auth) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }
  const token = auth.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' });
    }
    const decodedEmail = decoded.email;
    if (decodedEmail === userEmail) {
      req.email = decodedEmail;
      next();
    } else {
      return res.status(403).send({ message: 'Forbidden Access' });
    }
  });
};

// MongoDB
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.zbkdy.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const userCollection = client.db('delibhai').collection('users');
    const itemCollection = client.db('delifood').collection('items');
    const categoryCollection = client.db('delifood').collection('categories');

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);
      if (user.role === 'admin') {
        next();
      } else {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
    };

    // Update User and generate a JWT Token
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const userInfo = req.body;
      const updateDoc = {
        $set: userInfo,
      };
      const options = { upsert: true };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '3d',
      });
      res.send({ result, token });
    });

    // Generate a JWT Token for admin
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      if (user?.role === 'admin') {
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1d',
        });
        return res.send({ token });
      } else {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
    });

    // isAdmin
    app.get('/isAdmin', verifyJWT, verifyAdmin, (req, res) => {
      res.status(200).send({ admin: true });
    });

    // Get Categories
    app.get('/delifood/category', async (req, res) => {
      const result = await categoryCollection.find({}).toArray();
      res.send(result);
    });
    // POST Categories
    app.post('/delifood/category', async (req, res) => {
      const category = req.body;
      const result = await categoryCollection.insertOne(category);
      res.send(result);
    });

    // Get Available Items
    app.get('/projects/delifood/menu', async (req, res) => {
      const result = await itemCollection.find({ available: true }).toArray();
      res.send(result);
    });

    // Get Category wise  Items
    app.get('/projects/delifood/menu/:category', async (req, res) => {
      const category = req.params.category;
      const cursor = await itemCollection.find({}).toArray();
      const result = cursor.filter((c) => c.categories?.includes(category));
      res.send(result);
    });

    // Get Item Details
    app.get('/projects/delifood/item/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await itemCollection.findOne(query);
      res.send(result);
    });

    // Post Item
    app.post('/projects/delifood', async (req, res) => {
      const item = req.body;
      const result = await itemCollection.insertOne(item);
      res.send(result);
    });

    // Get All Items
    app.get('/admin/delifood', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await itemCollection.find().toArray();
      res.send(result);
    });

    // Remove Item
    app.delete(
      '/admin/delifood/:id',
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await itemCollection.deleteOne({ _id: ObjectId(id) });
        res.send(result);
      }
    );

    // Change Availability
    app.put('/admin/delifood/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const item = await itemCollection.findOne({ _id: ObjectId(id) });
      const updateDoc = {
        $set: {
          available: !item?.available,
        },
      };
      const result = await itemCollection.updateOne(
        { _id: ObjectId(id) },
        updateDoc
      );
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// Port Listening
app.listen(port, () => {
  console.log('deliBhai server is running...');
});
