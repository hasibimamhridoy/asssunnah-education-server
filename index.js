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
        const bookedClassessCollection = client.db("assSunnah").collection("bookedClassess");
        const enrolledClassessCollection = client.db("assSunnah").collection("EnrolledClassess");


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
                    role: getRole
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
            const query = { role: "instructor" }
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })



        /**
       * ---------------------------------------------------
       * Task Five - Get the Classess if it is approved by admin
       * ---------------------------------------------------
       */
        app.get('/classess', async (req, res) => {
            const query = { status: "approved" }
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
     * Task Seven - Approved / declain the classsess which was added by the instructors ------->
     * TODO : Verify jwt and admin
     * ---------------------------------------------------
     */
        app.patch('/admin/instructors/classess/:classId', async (req, res) => {
            const classId = req.params.classId
            const status = req.query.status
            const feedback = req.body.feedback
            const query = { _id: new ObjectId(classId) }
            let updateDoc = {}

            if (feedback) {

                updateDoc = {
                    $set: {
                        feedback: feedback
                    },
                }

                const result = await classessCollection.updateOne(query, updateDoc)
                return res.send(result)

            }

            updateDoc = {
                $set: {
                    status: status
                },
            }

            const result = await classessCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        
        /**
       * ---------------------------------------------------
       * Task Eight - Get the Classess whicj was added by the self users
       * TODO : Jwt
       * ---------------------------------------------------
       */
        app.get('/instructor/myAddeddClass/:email', async (req, res) => {
            
            const email = req.params.email
            const query = { instructor_email: email }
            const result = await classessCollection.find(query).toArray()
            res.send(result)

        })

        /**
      * ---------------------------------------------------
      * Task Nine - Add Classess only for instructors
      * ---------------------------------------------------
      */
        app.post('instructors/classess', async (req, res) => {
            const classInformation = req.body
            const result = await classessCollection.insertOne(classInformation)
            res.send(result)
        })
    
        /**
      * ---------------------------------------------------
      * Task Ten - Updated the classess instructors addeed
      * ---------------------------------------------------
      */
        app.put('/instructors/classess/:classId', async (req, res) => {
            
            const classId = req.params.classId
            const query = { _id: new ObjectId(classId) }
            const {image,class_name,instructor_name,instructor_email,available_seats,price} = req.body
           
            const updateDoc = {
                $set: {
                    image,
                    class_name,
                    available_seats,
                    price
                },
            }

            const result = await classessCollection.updateOne(query, updateDoc)
            res.send(result)

        })



         /**
       * ---------------------------------------------------
       * Task Eleven - Get the Classess whicj was added by the self users
       * TODO : Jwt
       * ---------------------------------------------------
       */
         app.get('/student/booked/classess/:email', async (req, res) => {
            
            const email = req.params.email
            const query = { userEmail: email }
            const result = await bookedClassessCollection.find(query).toArray()
            res.send(result)

        })

        /**
      * ---------------------------------------------------
      * Task Twoelve - add to the booked section by the users. user can added the classes.
      * ---------------------------------------------------
      */
        app.post('/student/booked/classess', async (req, res) => {
            const classInformation = req.body
            const result = await bookedClassessCollection.insertOne(classInformation)
            res.send(result)
        })


          /**
       * ---------------------------------------------------
       * Task Thirteen - Delete the Classess which was added by the self users
       * TODO : Jwt
       * ---------------------------------------------------
       */
          app.delete('/student/booked/classess/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookedClassessCollection.deleteOne(query)
            res.send(result)

        })


          /**
       * ---------------------------------------------------
       * Task Eleven - Get the enrolledd Classess whicj was enrolled self users
       * TODO : Jwt
       * ---------------------------------------------------
       */
          app.get('/student/enrolled/classess/:email', async (req, res) => {
            
            const email = req.params.email
            const query = { userEmail: email }
            const result = await enrolledClassessCollection.find(query).toArray()
            res.send(result)

        })


        /**
      * ---------------------------------------------------
      * Task Fourteen - when user payment complete then it will work and he enrolled the classess.
      * ---------------------------------------------------
      */
          app.post('/student/enrolled/classess', async (req, res) => {
            const classInformation = req.body
            const result = await enrolledClassessCollection.insertOne(classInformation)
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