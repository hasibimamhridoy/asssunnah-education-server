const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

console.log(`${process.env.DB_USERNAME}`);
console.log(`${process.env.DB_PASS}`);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@assunnah.0dwmbh6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("assSunnah").collection("users");
    const classessCollection = client.db("assSunnah").collection("classess");
    

    /**
     * ---------------------------------------------------
     * Task One - Get the all USERS from data base
     * TODO : Verify jwt and admin
     * ---------------------------------------------------
     */
    app.get('/users', async (req, res) => {
        const result = await usersCollection.find().toArray()
        res.send(result)
      })

       /**
     * ---------------------------------------------------
     * Task Two - SAVED USERS
     * ---------------------------------------------------
     */
    app.put('/users/:email', async (req, res) => {
        const email = req.params.email
        const user = req.body
        const query = { email: email }
        const options = { upsert: true }
        const updateDoc = {
          $set: user,
        }
        const result = await usersCollection.updateOne(query, updateDoc, options)
        res.send(result)
      })

       /**
     * ---------------------------------------------------
     * Task Three - Set role -------> admin or instructor
     * TODO : Verify jwt and admin
     * ---------------------------------------------------
     */
    app.patch('/users/:email', async (req, res) => {
        const email = req.params.email
        const getRole = req.query.role
        const query = { email: email }
        const updateDoc = {
          $set: {
            role : getRole
          },
        }
        const result = await usersCollection.updateOne(query, updateDoc)
        res.send(result)
      })

      
      /**
     * ---------------------------------------------------
     * Task Four - Get the Instructors
     * ---------------------------------------------------
     */
    app.get('/instructors', async (req, res) => {
        const query = {role : "instructor"}
        const result = await usersCollection.find(query).toArray()
        res.send(result)
      })



      /**
     * ---------------------------------------------------
     * Task Five - Get the Classess if it is approved by admin
     * ---------------------------------------------------
     */
    app.get('classess', async (req, res) => {
        const query = {statuss : "approved"}
        const result = await classessCollection.find(query).toArray()
        res.send(result)
      })

      /**
     * ---------------------------------------------------
     * Task Six - Get all the Classess whics post from the instructors
     * TODO : Verify Admin
     * ---------------------------------------------------
     */
    app.get('/admin/classess', async (req, res) => {
        const result = await classessCollection.find().toArray()
        res.send(result)
      })


       /**
     * ---------------------------------------------------
     * Task Five - Add Classess only for instructors
     * ---------------------------------------------------
     */
    app.post('instructors/classess', async (req, res) => {
        const classInformation = req.body
        const result = await classessCollection.insertOne(classInformation)
        res.send(result)
      })








    
    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server is running')
})

app.listen(port, () => {
  console.log(`The server is running on port ${port}`);
})