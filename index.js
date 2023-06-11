const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json());



//all middle ware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}




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
        const paymentCollection = client.db("assSunnah").collection("payments");


        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }
        const verifyInstructors = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        //get if the user is admin
        app.get('/users/admin/:email',async (req, res) => {
            const email = req.params.email;

            // if (req.decoded.email !== email) {
            //     return res.send({ admin: false })
            // }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            console.log(result);
            res.send(result);
        })
        //get if the user is instructors
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;

            // if (req.decoded.email !== email) {
            //     return res.send({ instructor: false })
            // }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })


        //Here is the send token jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ token })
        })

        /**
         * ---------------------------------------------------
         * Task One - Get the all USERS from data base
         * Done
         * ---------------------------------------------------
         */
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
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
      * Done
      * ---------------------------------------------------
      */
        app.patch('/users/:email', verifyJWT,verifyAdmin, async (req, res) => {
            const email = req.params.email
            const getRole = req.body.role
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
               * Task Four - Deleted the user
               * Done
               * ---------------------------------------------------
               */

        app.delete('/users/:id', verifyJWT,verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
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
            const sort = {total_enrolled: -1}
            const result = await classessCollection.find(query).sort(sort).toArray()
            res.send(result)
        })

        /**
       * ---------------------------------------------------
       * Task Five - Get the instructor if it is approved by admin
       * ---------------------------------------------------
       */
        app.get('/instructors', async (req, res) => {
            const query = { role: "instructor" }
            const sort = {total_enrolled: -1}
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })

        /**
       * ---------------------------------------------------
       * Task Six - Get all the Classess whics post from the instructors
       * Done
       * ---------------------------------------------------
       */
        app.get('/admin/classess',verifyJWT,verifyAdmin, async (req, res) => {
            const result = await classessCollection.find().toArray()
            res.send(result)
        })


        /**
     * ---------------------------------------------------
     * Task Seven - Approved / declain the classsess which was added by the instructors ------->
     * Done
     * ---------------------------------------------------
     */
        app.patch('/admin/instructors/classess/:classId',verifyJWT,verifyAdmin, async (req, res) => {
            const classId = req.params.classId
            const feedback = req.body.feedback
            const status = req.body.status
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
       * Done
       * ---------------------------------------------------
       */
        app.get('/instructor/myAddeddClass/:email',verifyJWT,verifyInstructors, async (req, res) => {

            const email = req.params.email
            const query = { instructor_email: email }
            const result = await classessCollection.find(query).toArray()
            res.send(result)

        })

        /**
      * ---------------------------------------------------
      * Task Nine - Add Classess only for instructors
      * Done
      * ---------------------------------------------------
      */
        app.post('/instructors/classess',verifyJWT,verifyInstructors, async (req, res) => {
            const classInformation = req.body
            const result = await classessCollection.insertOne(classInformation)
            res.send(result)
        })

        /**
      * ---------------------------------------------------
      * Task Ten - Updated the classess instructors addeed
      * Done
      * ---------------------------------------------------
      */
        app.put('/instructors/classess/:classId',verifyJWT,verifyInstructors, async (req, res) => {

            const classId = req.params.classId
            console.log('hitting',classId);
            const query = { _id: new ObjectId(classId) }
            const { image, class_name, instructor_name, instructor_email, available_seats, price } = req.body

            console.log(req.body);

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
      * Task Eleven - Get the single Classe which was added by the instructor
      * Done
      * ---------------------------------------------------
      */
         app.get('/instructor/classess/:id',verifyJWT,verifyInstructors, async (req, res) => {

            const id = req.params.id
            const query = { _id: new ObjectId(id)}
            const result = await classessCollection.findOne(query)
            res.send(result)

        })



        /**
      * ---------------------------------------------------
      * Task Eleven - Get the booked Classess which was added by the student users
      * Done
      * ---------------------------------------------------
      */
        app.get('/student/booked/classess/:email',verifyJWT, async (req, res) => {

            const email = req.params.email
            const query = { userEmail: email }
            const result = await bookedClassessCollection.find(query).toArray()
            res.send(result)

        })
        /**
      * ---------------------------------------------------
      * Task Eleven - Get the Payment History for users
      * Done
      * ---------------------------------------------------
      */
        app.get('/student/payment/history/:email',verifyJWT, async (req, res) => {

            const email = req.params.email
            const query = { email: email }
            const sort = {date : -1}
            const result = await paymentCollection.find(query).sort(sort).toArray()
            res.send(result)

        })

        /**
      * ---------------------------------------------------
      * Task Eleven - Get the Enrolled class by users
      * Done
      * ---------------------------------------------------
      */
        app.get('/student/enrolled/classess/:email',verifyJWT, async (req, res) => {

            const email = req.params.email
            const query = { userEmail: email }
            const result = await enrolledClassessCollection.find(query).toArray()
            res.send(result)

        })


        /**
      * ---------------------------------------------------
      * Need to check if the booked item already in booked collecktion
      * Done
      * ---------------------------------------------------
      */
        app.get('/student/isBooked/classess/:email', async (req, res) => {
            try {
              const email = req.params.email;
              const query = {userEmail : email}
              const result = await bookedClassessCollection.find(query).toArray();
          
              const disabledIds = result.map(res=>res.courseId)
              console.log(disabledIds);

              if (result) {
                res.send(disabledIds);
              } else {
                res.status(404).send('Item not found');
              }
            } catch (error) {
              res.status(500).send('Error retrieving item');
            }
          });
        /**
      * ---------------------------------------------------
      * Need to check if Already enrolled the classss 
      * Done
      * ---------------------------------------------------
      */
        app.get('/student/clasess/alreadyEnrolled/:email', async (req, res) => {
            try {
              const email = req.params.email;
              const query = {userEmail : email}
              const result = await enrolledClassessCollection.find(query).toArray();
        
              const disabledIds = result.map(res=>res.courseId)
              console.log(disabledIds);

              if (result) {
                res.send(disabledIds);
              } else {
                res.status(404).send('Item not found');
              }
            } catch (error) {
              res.status(500).send('Error retrieving item');
            }
          });

        /**
      * ---------------------------------------------------
      * Task Twoelve - add to the booked section by the users. user can added the classes.
      * Done
      * ---------------------------------------------------
      */
        app.post('/student/booked/classess', async (req, res) => {
            const classInformation = req.body
            const result = await bookedClassessCollection.insertOne(classInformation)
            res.send(result)
        })


        /**
     * ---------------------------------------------------
     * Task Thirteen - Delete the Booked Classess which was added by the self users
     * Done
     * ---------------------------------------------------
     */
        app.delete('/student/booked/classess/:id',verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookedClassessCollection.deleteOne(query)
            res.send(result)

        })


        /**
     * ---------------------------------------------------
     * Task Eleven - Get the enrolledd Classess whicj was enrolled self users
     * Done
     * ---------------------------------------------------
     */
        app.get('/student/enrolled/classess/:email',verifyJWT, async (req, res) => {

            const email = req.params.email
            const query = { userEmail: email }
            const result = await enrolledClassessCollection.find(query).toArray()
            res.send(result)

        })

        //get booked single data for payment price
        app.get('/student/booked/classess/paymentPrice/:id', async (req, res) => {

            const id = req.params.id
            const query = { _id: new ObjectId(id)}
            const result = await bookedClassessCollection.findOne(query)
            res.send(result)

        })


        /**
      * ---------------------------------------------------
      * Task Fourteen - when user payment complete then it will work and he enrolled the classess.
      * ---------------------------------------------------
      */
        app.post('/student/enrolled/classess',verifyJWT, async (req, res) => {
            const classInformation = req.body
            const result = await enrolledClassessCollection.insertOne(classInformation)
            res.send(result)
        })

     
        /**
       * ---------------------------------------------------
       * Task Sixteen - Get tPayment History
       * TODO : Jwt
       * ---------------------------------------------------
       */
        app.get('/student/payment/history/:email', async (req, res) => {

            const email = req.params.email
            const query = { userEmail: email }
            const sort = { date: 1 }
            const result = await enrolledClassessCollection.find(query).sort(sort).toArray()
            res.send(result)

        })


        /**
      * ---------------------------------------------------
      * Task Seventeen - Get the enrolledd Classess whicj was enrolled self users
      * TODO : Jwt
      * ---------------------------------------------------
      */
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        // payment related api
       app.post('/payments/success/:id', verifyJWT, async(req, res) =>{
        const payment = req.body;
        const id = req.params.id
        const insertResult = await paymentCollection.insertOne(payment);
        const query = {_id: new ObjectId(id) }
        const deleteResult = await bookedClassessCollection.deleteOne(query)
  
        res.send({ insertResult, deleteResult});
      })


      //get data to count enrolled student

      app.get('/student/enrolled/count/:courseId', async (req, res) => {

        const courseId = req.params.courseId
        const query = { courseId: courseId }
        const result = await enrolledClassessCollection.countDocuments(query)
        res.send({result})
    })


    /**
      * ---------------------------------------------------
      * Task Three - Set role -------> admin or instructor
      * TODO : Verify jwt and admin
      * ---------------------------------------------------
      */
    app.patch('/student/enrolled/count/:courseId', async (req, res) => {
        const courseId = req.params.courseId
        const enrolledCount = req.body
        console.log(enrolledCount);
        const query = { _id: new ObjectId(courseId) }
        const updateDoc = {
            $set: {
                available_seats:enrolledCount.available_seats_remaining,
                total_enrolled:enrolledCount.totalEnrolledCount,
                
            },
        }
        const result = await classessCollection.updateOne(query, updateDoc)
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